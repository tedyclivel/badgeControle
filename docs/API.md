# Contrats d’API et opérations serveur

## Principes

Le navigateur utilise la clé publique Supabase et les politiques RLS. Les écritures sensibles passent par une RPC ou une Edge Function ; aucune clé `service_role` ne doit être exposée au frontend.

## `POST /functions/v1/synchroniser_passages`

Accessible à un agent authentifié. Le corps contient entre un et cent événements :

```json
{ "evenements": [{ "identifiantEvenementLocal": "uuid", "identifiantCodeQr": "uuid", "identifiantBadge": "uuid", "identifiantEcole": "uuid", "identifiantAppareil": "uuid", "identifiantPointControle": "uuid", "heureLocale": "ISO-8601", "decalageHorlogeSecondes": null, "donneesSignees": {}, "signatureBase64": "…" }] }
```

La réponse associe chaque identifiant local à un résultat. `ACCEPTED` et `ALREADY_SYNCED` acquittent l’événement local. Un refus métier (`BADGE_INACTIVE`, `QR_EXPIRED`, `QR_ALREADY_CONSUMED`, `DEVICE_UNAUTHORIZED`, `CHECKPOINT_INVALID`, `QR_NOT_FOUND`, `CODE_INCOHERENT`) est conservé comme rejeté. Une erreur temporaire reste dans la file pour une nouvelle tentative.

## RPC `synchroniser_passage_serveur`

Appelée uniquement par l’Edge Function avec le rôle serveur. Elle vérifie l’unicité par terminal et identifiant local, puis crée un passage avec un statut de validation et d’horloge. La procédure est idempotente : une retransmission retourne `ALREADY_SYNCED`.

## Synthèse journalière

`generer_synthese` est réservé au Responsable de l’établissement demandé. Les faits sont comptés par le serveur, mis en cache par empreinte et, sans fournisseur IA configuré, restitués par un gabarit avec `source = TEMPLATE`.
