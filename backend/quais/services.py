from datetime import timedelta
from django.db.models import Q
from .models import GroupeDePlaces, Place, Affectation

from django.db import transaction, IntegrityError

class AucunePlaceDisponibleError(Exception):
    pass


def _dates_sejour(reservation):
    debut = reservation.date_arrivee
    fin = reservation.date_depart
    if hasattr(debut, 'date'):
        debut = debut.date()
    if hasattr(fin, 'date'):
        fin = fin.date()
    nb_nuits = max((fin - debut).days, 1)
    return [debut + timedelta(days=i) for i in range(nb_nuits)]


def trouver_groupes_compatibles(bateau, reservation=None):
    qs = GroupeDePlaces.objects.filter(
        Q(longueur_min__isnull=True) | Q(longueur_min__lte=bateau.longueur),
        Q(longueur_max__isnull=True) | Q(longueur_max__gte=bateau.longueur),
        Q(largeur_min__isnull=True) | Q(largeur_min__lte=bateau.largeur),
        Q(largeur_max__isnull=True) | Q(largeur_max__gte=bateau.largeur),
        )
    if bateau.tirant_eau is not None:
        qs = qs.filter(
            Q(tirant_eau_min__isnull=True) | Q(tirant_eau_min__lte=bateau.tirant_eau),
            Q(tirant_eau_max__isnull=True) | Q(tirant_eau_max__gte=bateau.tirant_eau),
            )
    if reservation and reservation.type_bassin:
        qs = qs.filter(type_bassin=reservation.type_bassin)
    return qs.order_by('id')


def place_est_libre(place, dates):
    return not Affectation.objects.filter(place=place, date__in=dates).exists()


def affecter_place_automatiquement(reservation):
    bateau = reservation.bateau
    dates = _dates_sejour(reservation)

    for groupe in trouver_groupes_compatibles(bateau, reservation):
        for place in groupe.places.order_by('id'):
            if not place_est_libre(place, dates):
                continue
            try:
                with transaction.atomic():
                    affectations = [
                        Affectation(reservation=reservation, place=place, date=d, statut='aucun')
                        for d in dates
                    ]
                    return Affectation.objects.bulk_create(affectations)
            except IntegrityError:
                # Une transaction concurrente a pris cette place/date entre-temps
                # (contrainte unique_together('place', 'date') violée) : on essaie la place suivante.
                continue

    raise AucunePlaceDisponibleError(
        f"Aucune place disponible pour {bateau} du {dates[0]} au {dates[-1]}"
    )
