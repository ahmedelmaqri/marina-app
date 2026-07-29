"""
Tests du portail client (app portail).

On teste ici toute la surface HTTP exposée aux clients : activation de compte,
connexion JWT, consultation de ses propres données (réservations, bateaux,
documents, factures) avec isolation stricte entre clients, upload de document,
et le cycle de paiement Stripe (session de paiement créée + webhook qui
marque la facture payée). Les appels réels vers l'API Stripe sont mockés :
aucune clé API réelle n'est nécessaire pour lancer cette suite.

Lancer tous les tests de cette app :
    python manage.py test portail
"""

import shutil
import tempfile
from datetime import date
from decimal import Decimal
from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

import stripe

from clients.models import Client
from bateaux.models import Bateau
from contrats.models import GrilleTarifaire
from reservations.models import Escale
from portail.models import DocumentClient, Facture, PaiementStripe

Utilisateur = get_user_model()


def aware(d):
    return timezone.make_aware(timezone.datetime.combine(d, timezone.datetime.min.time()))


class BasePortailTestCase(APITestCase):
    """Fixtures communes : deux clients distincts (A et B) avec compte activé,
    chacun son bateau et sa réservation, pour vérifier l'isolation des données."""

    def setUp(self):
        self.client_a = Client.objects.create(
            type_client='physique', nom_prenom='Client A',
            email='client.a@example.ma', telephone='+212600000001',
        )
        self.client_b = Client.objects.create(
            type_client='physique', nom_prenom='Client B',
            email='client.b@example.ma', telephone='+212600000002',
        )

        self.mot_de_passe = 'MotDePasse123'

        self.user_a = Utilisateur.objects.create_user(
            username=self.client_a.email, email=self.client_a.email,
            password=self.mot_de_passe, role='client',
        )
        self.client_a.compte = self.user_a
        self.client_a.save(update_fields=['compte'])

        self.user_b = Utilisateur.objects.create_user(
            username=self.client_b.email, email=self.client_b.email,
            password=self.mot_de_passe, role='client',
        )
        self.client_b.compte = self.user_b
        self.client_b.save(update_fields=['compte'])

        self.bateau_a = Bateau.objects.create(
            client=self.client_a, nom_navire='Bateau A',
            type_bateau='Voilier', longueur=Decimal('10.00'), largeur=Decimal('3.00'),
        )
        self.bateau_b = Bateau.objects.create(
            client=self.client_b, nom_navire='Bateau B',
            type_bateau='Voilier', longueur=Decimal('9.00'), largeur=Decimal('3.00'),
        )

        self.grille = GrilleTarifaire.objects.create(
            nom='Journalière test', structure_tarifaire='journaliere',
            tarif_base=Decimal('100.00'), taxe=Decimal('20.00'),
        )

        self.reservation_a = Escale.objects.create(
            client=self.client_a, bateau=self.bateau_a, grille_tarifaire=self.grille,
            date_arrivee=aware(date(2026, 8, 1)), date_depart=aware(date(2026, 8, 4)),
        )
        self.reservation_b = Escale.objects.create(
            client=self.client_b, bateau=self.bateau_b, grille_tarifaire=self.grille,
            date_arrivee=aware(date(2026, 8, 1)), date_depart=aware(date(2026, 8, 4)),
        )

        self.facture_a = Facture.objects.create(
            reservation=self.reservation_a, montant=Decimal('360.00'),
        )
        self.facture_b = Facture.objects.create(
            reservation=self.reservation_b, montant=Decimal('360.00'),
        )

    def _authenticate(self, username):
        response = self.client.post('/api/portail/login/', {
            'username': username, 'password': self.mot_de_passe,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
        return response.data


class ActivationCompteClientTestCase(APITestCase):
    def setUp(self):
        self.client_libre = Client.objects.create(
            type_client='physique', nom_prenom='Client Libre',
            email='libre@example.ma', telephone='+212600000003',
        )

    def test_activation_reussie(self):
        response = self.client.post('/api/portail/activation/', {
            'client_id': self.client_libre.id, 'email': 'libre@example.ma', 'password': 'MotDePasse123',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.client_libre.refresh_from_db()
        self.assertIsNotNone(self.client_libre.compte)
        self.assertEqual(self.client_libre.compte.role, 'client')
        self.assertEqual(self.client_libre.compte.username, 'libre@example.ma')

    def test_activation_email_insensible_a_la_casse(self):
        response = self.client.post('/api/portail/activation/', {
            'client_id': self.client_libre.id, 'email': 'LIBRE@EXAMPLE.MA', 'password': 'MotDePasse123',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_activation_mauvais_client_id(self):
        response = self.client.post('/api/portail/activation/', {
            'client_id': 999999, 'email': 'libre@example.ma', 'password': 'MotDePasse123',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_activation_mauvais_email(self):
        response = self.client.post('/api/portail/activation/', {
            'client_id': self.client_libre.id, 'email': 'faux@example.ma', 'password': 'MotDePasse123',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_activation_compte_deja_lie(self):
        user = Utilisateur.objects.create_user(username='dejala@example.ma', password='xxxxxxxx', role='client')
        self.client_libre.compte = user
        self.client_libre.save(update_fields=['compte'])

        response = self.client.post('/api/portail/activation/', {
            'client_id': self.client_libre.id, 'email': 'libre@example.ma', 'password': 'MotDePasse123',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_activation_mot_de_passe_trop_court(self):
        response = self.client.post('/api/portail/activation/', {
            'client_id': self.client_libre.id, 'email': 'libre@example.ma', 'password': 'court',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_activation_username_deja_pris_par_un_autre_compte(self):
        """Bug réel trouvé en testant dans le navigateur : un Utilisateur avec ce username
        peut déjà exister (ex: fiche Client supprimée après activation, compte orphelin)
        sans que client.compte_id soit renseigné sur CE client -> IntegrityError 500 côté
        create_user() si on ne vérifie pas l'unicité du username en amont dans validate()."""
        Utilisateur.objects.create_user(username='libre@example.ma', password='xxxxxxxx', role='client')

        response = self.client.post('/api/portail/activation/', {
            'client_id': self.client_libre.id, 'email': 'libre@example.ma', 'password': 'MotDePasse123',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LoginTestCase(BasePortailTestCase):
    def test_login_client_reussi(self):
        data = self._authenticate(self.client_a.email)
        self.assertIn('access', data)
        self.assertIn('refresh', data)

    def test_login_mauvais_mot_de_passe(self):
        response = self.client.post('/api/portail/login/', {
            'username': self.client_a.email, 'password': 'mauvais',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_token(self):
        data = self._authenticate(self.client_a.email)
        response = self.client.post('/api/portail/login/refresh/', {
            'refresh': data['refresh'],
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)


class MesInfosViewTestCase(BasePortailTestCase):
    def test_me_retourne_le_bon_client(self):
        self._authenticate(self.client_a.email)
        response = self.client.get('/api/portail/me/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.client_a.id)

    def test_me_sans_authentification(self):
        response = self.client.get('/api/portail/me/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_utilisateur_sans_client_profile(self):
        """Un compte 'client' orphelin (sans fiche Client liée) doit être rejeté proprement,
        pas planter en 500 — vérifie que EstProprietaireClient gère bien l'absence de client_profile."""
        orphelin = Utilisateur.objects.create_user(username='orphelin@example.ma', password='xxxxxxxx', role='client')
        response = self.client.post('/api/portail/login/', {
            'username': 'orphelin@example.ma', 'password': 'xxxxxxxx',
        }, format='json')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

        response = self.client.get('/api/portail/me/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class MesReservationsTestCase(BasePortailTestCase):
    def test_liste_ne_contient_que_ses_reservations(self):
        self._authenticate(self.client_a.email)
        response = self.client.get('/api/portail/mes-reservations/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [r['id'] for r in response.data]
        self.assertIn(self.reservation_a.id, ids)
        self.assertNotIn(self.reservation_b.id, ids)

    def test_detail_accessible_au_proprietaire(self):
        self._authenticate(self.client_a.email)
        response = self.client.get(f'/api/portail/mes-reservations/{self.reservation_a.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_detail_interdit_pour_autre_client(self):
        # Le queryset filtre déjà par client_profile : la réservation d'un autre
        # client sort du get_queryset() avant même la vérification d'objet -> 404, pas 403.
        self._authenticate(self.client_b.email)
        response = self.client.get(f'/api/portail/mes-reservations/{self.reservation_a.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_paiements_nested_presents(self):
        self._authenticate(self.client_a.email)
        response = self.client.get(f'/api/portail/mes-reservations/{self.reservation_a.id}/')
        self.assertGreater(len(response.data['paiements']), 0)
        self.assertEqual(Decimal(response.data['paiements'][0]['montant']), self.reservation_a.prix_total)


class MesBateauxTestCase(BasePortailTestCase):
    def test_liste_filtree_par_client(self):
        self._authenticate(self.client_a.email)
        response = self.client.get('/api/portail/mes-bateaux/')
        ids = [b['id'] for b in response.data]
        self.assertIn(self.bateau_a.id, ids)
        self.assertNotIn(self.bateau_b.id, ids)

    def test_creation_assigne_client_automatiquement(self):
        self._authenticate(self.client_a.email)
        response = self.client.post('/api/portail/mes-bateaux/', {
            'nom_navire': 'Nouveau bateau', 'type_bateau': 'Yacht',
            'longueur': '12.00', 'largeur': '4.00',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        bateau = Bateau.objects.get(id=response.data['id'])
        self.assertEqual(bateau.client_id, self.client_a.id)

    def test_impossible_de_voir_bateau_dautre_client(self):
        self._authenticate(self.client_b.email)
        response = self.client.get(f'/api/portail/mes-bateaux/{self.bateau_a.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


_MEDIA_ROOT_TEST = tempfile.mkdtemp()


@override_settings(MEDIA_ROOT=_MEDIA_ROOT_TEST)
class MesDocumentsTestCase(BasePortailTestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(_MEDIA_ROOT_TEST, ignore_errors=True)

    def test_upload_document(self):
        self._authenticate(self.client_a.email)
        fichier = SimpleUploadedFile('permis.pdf', b'contenu-test', content_type='application/pdf')
        response = self.client.post('/api/portail/mes-documents/', {
            'type_document': 'permis_navigation', 'fichier': fichier,
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        document = DocumentClient.objects.get(id=response.data['id'])
        self.assertEqual(document.client_id, self.client_a.id)
        self.assertEqual(document.nom_original, 'permis.pdf')

    def test_liste_filtree_par_client(self):
        DocumentClient.objects.create(
            client=self.client_a, type_document='assurance',
            fichier=SimpleUploadedFile('assurance_a.pdf', b'a'),
        )
        DocumentClient.objects.create(
            client=self.client_b, type_document='assurance',
            fichier=SimpleUploadedFile('assurance_b.pdf', b'b'),
        )
        self._authenticate(self.client_a.email)
        response = self.client.get('/api/portail/mes-documents/')
        noms = [d['nom_original'] for d in response.data]
        self.assertIn('assurance_a.pdf', noms)
        self.assertNotIn('assurance_b.pdf', noms)

    def test_document_dautre_client_inaccessible(self):
        document_b = DocumentClient.objects.create(
            client=self.client_b, type_document='assurance',
            fichier=SimpleUploadedFile('assurance_b.pdf', b'b'),
        )
        self._authenticate(self.client_a.email)
        response = self.client.get(f'/api/portail/mes-documents/{document_b.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class MesFacturesTestCase(BasePortailTestCase):
    def test_liste_filtree_par_client(self):
        self._authenticate(self.client_a.email)
        response = self.client.get('/api/portail/mes-factures/')
        ids = [f['id'] for f in response.data]
        self.assertIn(self.facture_a.id, ids)
        self.assertNotIn(self.facture_b.id, ids)

    def test_facture_dautre_client_inaccessible(self):
        self._authenticate(self.client_b.email)
        response = self.client.get(f'/api/portail/mes-factures/{self.facture_a.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class CreerPaiementFactureTestCase(BasePortailTestCase):
    @patch('portail.services.stripe.checkout.Session.create')
    def test_creation_session_paiement(self, mock_create):
        mock_create.return_value = Mock(id='cs_test_123', url='https://checkout.stripe.com/test')

        self._authenticate(self.client_a.email)
        response = self.client.post(f'/api/portail/factures/{self.facture_a.id}/payer/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['checkout_url'], 'https://checkout.stripe.com/test')

        paiement = PaiementStripe.objects.get(stripe_session_id='cs_test_123')
        self.assertEqual(paiement.facture_id, self.facture_a.id)
        self.assertEqual(paiement.statut, 'en_attente')

    @patch('portail.services.stripe.checkout.Session.create')
    def test_facture_deja_payee_rejetee(self, mock_create):
        self.facture_a.statut = 'payee'
        self.facture_a.save()

        self._authenticate(self.client_a.email)
        response = self.client.post(f'/api/portail/factures/{self.facture_a.id}/payer/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        mock_create.assert_not_called()

    @patch('portail.services.stripe.checkout.Session.create')
    def test_facture_dautre_client_rejetee(self, mock_create):
        self._authenticate(self.client_b.email)
        response = self.client.post(f'/api/portail/factures/{self.facture_a.id}/payer/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        mock_create.assert_not_called()

    @patch('portail.services.stripe.checkout.Session.create')
    def test_erreur_stripe_retourne_502(self, mock_create):
        mock_create.side_effect = stripe.error.StripeError('boom')

        self._authenticate(self.client_a.email)
        response = self.client.post(f'/api/portail/factures/{self.facture_a.id}/payer/')

        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)


class WebhookStripeTestCase(BasePortailTestCase):
    @patch('portail.views.stripe.Webhook.construct_event')
    def test_webhook_signature_invalide(self, mock_construct):
        mock_construct.side_effect = stripe.error.SignatureVerificationError('bad sig', 'sig_header')

        response = self.client.post(
            '/api/portail/webhook-stripe/', data=b'{}', content_type='application/json',
            HTTP_STRIPE_SIGNATURE='faux',
        )
        self.assertEqual(response.status_code, 400)

    @patch('portail.views.stripe.Webhook.construct_event')
    def test_webhook_checkout_session_completed(self, mock_construct):
        PaiementStripe.objects.create(
            facture=self.facture_a, stripe_session_id='cs_test_123',
            montant=self.facture_a.montant, statut='en_attente',
        )
        mock_construct.return_value = {
            'type': 'checkout.session.completed',
            'data': {'object': {
                'id': 'cs_test_123',
                'payment_intent': 'pi_test_123',
                'metadata': {'facture_id': str(self.facture_a.id)},
            }},
        }

        response = self.client.post(
            '/api/portail/webhook-stripe/', data=b'{}', content_type='application/json',
            HTTP_STRIPE_SIGNATURE='valide',
        )
        self.assertEqual(response.status_code, 200)

        self.facture_a.refresh_from_db()
        self.assertEqual(self.facture_a.statut, 'payee')
        self.assertIsNotNone(self.facture_a.date_paiement)

        paiement = PaiementStripe.objects.get(stripe_session_id='cs_test_123')
        self.assertEqual(paiement.statut, 'reussi')
        self.assertEqual(paiement.stripe_payment_intent, 'pi_test_123')

    @patch('portail.views.stripe.Webhook.construct_event')
    def test_webhook_facture_introuvable(self, mock_construct):
        mock_construct.return_value = {
            'type': 'checkout.session.completed',
            'data': {'object': {'id': 'cs_x', 'payment_intent': 'pi_x', 'metadata': {'facture_id': '999999'}}},
        }
        response = self.client.post(
            '/api/portail/webhook-stripe/', data=b'{}', content_type='application/json',
            HTTP_STRIPE_SIGNATURE='valide',
        )
        self.assertEqual(response.status_code, 200)

    @patch('portail.views.stripe.Webhook.construct_event')
    def test_webhook_type_evenement_ignore(self, mock_construct):
        mock_construct.return_value = {
            'type': 'payment_intent.created',
            'data': {'object': {}},
        }
        response = self.client.post(
            '/api/portail/webhook-stripe/', data=b'{}', content_type='application/json',
            HTTP_STRIPE_SIGNATURE='valide',
        )
        self.assertEqual(response.status_code, 200)
        self.facture_a.refresh_from_db()
        self.assertEqual(self.facture_a.statut, 'impayee')
