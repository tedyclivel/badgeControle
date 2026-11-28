# Codes QR dynamiques et signés

## Contrat du code QR

Chaque code QR contient un objet JSON et une signature ECDSA P-256 encodée en Base64URL. L'objet signé porte uniquement : la version, l'identifiant opaque du code, l'identifiant opaque du badge, l'établissement, le numéro de séquence et les bornes de validité. Il ne contient ni nom, ni classe, ni autre donnée nominative.

La durée maximale est de cinq minutes. Un code est associé à un badge et à un numéro de séquence de période ; une génération concurrente retrouve donc le même code préalablement enregistré au lieu d'en créer plusieurs pour la même période.

## Gestion des clés

`CLE_PRIVEE_QR_JWK` est une clé privée ECDSA P-256 au format JWK, configurée uniquement comme secret de l'Edge Function. Elle ne doit jamais être écrite dans `.env.local`, IndexedDB, le navigateur ou Git.

La clé publique est dérivée de cette clé privée et renvoyée avec les codes générés. Le terminal Agent la conserve localement pour vérifier les signatures sans réseau. Une future synchronisation téléchargera explicitement cette clé et les révocations connues avant les scans hors ligne.

## Génération

L'Edge Function `generer_codes_qr` exige un responsable authentifié de l'établissement du badge. Elle prépare de un à 288 codes à l'avance, soit au plus vingt-quatre heures. Les plages sont alignées sur des périodes de cinq minutes et la base interdit deux séquences pour le même badge.

## Consommation et limite assumée

Le premier scan valide consomme le code dans une transaction ; tous les scans ultérieurs du même code retournent `DEJA_CONSOMME` et sont journalisés. Cette propriété est garantie par le serveur quand le terminal est connecté, puis arbitre les conflits au retour du réseau.

En mode hors ligne, chaque terminal peut empêcher un rejeu qu'il a déjà vu, mais deux terminaux isolés peuvent accepter provisoirement le même QR avant synchronisation. Sans défi-réponse, une photographie peut donc réussir ce premier scan. Cette limite est documentée et l'anomalie de duplication sera créée lors de la future synchronisation métier.
