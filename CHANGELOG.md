# Journal de l’indice

## 2026-11-11 — Ouverture hors ligne et repli sans stockage

- Aucune ressource externe n’était chargée ; la page s’ouvrait déjà en `file://`.
  En revanche, une fois servie, elle ne se rouvrait pas sans réseau
  (`ERR_INTERNET_DISCONNECTED` au rechargement, `ERR_CONNECTION_REFUSED` serveur
  arrêté). `sw.js` garde une copie des quatre fichiers de l’outil, réseau d’abord :
  la version publiée prime en ligne, la copie sert hors ligne.
- Stockage indisponible : aucun plantage avant correction, mais des messages
  faux (« Elle reste préservée », « Vos réponses restent sur cet appareil » alors
  que l’écriture était refusée). L’écriture est éprouvée avant toute promesse ; le
  message dit désormais que la progression ne sera pas conservée et renvoie au
  fichier. Une sauvegarde illisible reste intacte et n’est jamais réécrite.
- Questions, niveaux, calcul et format du brouillon inchangés : empreinte
  figée par test, égalité de `diagnose` et du Markdown vérifiée sur 50 101 jeux
  de réponses contre l’état précédent.
- Seize tests `node --test` en CI ; recette navigateur Chromium versionnée hors CI.
  Recette sur GitHub Pages après publication, Safari/Firefox, première visite sans
  réseau et réseau très lent restent à recevoir.

## 2026-10-07 — Bilan déclaratif et travail reprenable

- Un questionnaire partiel conserve ses réponses et sa couverture, sans indice
  global ni prescription définitive. Les seize questions restent inchangées.
- Les égalités sont explicites ; une note élevée ne prouve pas une autonomie.
- Nom de marque rendu comme texte, questions associées aux champs, mobile et
  barres lisibles. Aucun script ni style issu du nom n’est interprété.
- Reprise locale et fichier Markdown versionné pour les sources du dossier.
  Aucun agent, appel fournisseur, envoi réseau ou achat n’est nécessaire.
- Six tests de diagnostic, validation, reprise et encodage. Le contre-exemple
  initial a été reçu dans l’interface publique ; la recette native du correctif
  reste à faire après sa publication. Le raccord documentaire ne vaut pas
  validation réelle de SPAWT, FrieslandCampina ou d’une autre entreprise.
