# Indice de maturité créative ADVE

**Le diagnostic d'entrée.** Seize questions, quatre axes, un indice déclaratif de
0 à 5 et une piste à examiner. Les réponses qualifient un point de départ ; elles
ne prouvent ni performance commerciale ni autonomie opérationnelle.

Le dirigeant peut conserver un bilan incomplet et poursuivre son travail. L'indice
global exige les seize réponses ; la prescription reste à confronter aux sources,
aux objectifs et aux décisions de l'entreprise.

## Position au portefeuille

Produit **00 · Acquisition** de [Creative Next](https://github.com/xtincell/shinkiro/blob/main/docs/PORTFOLIO.md).
Gratuit, 20 minutes, qualification.

C'est le seul produit du catalogue où **l'outil *est* l'offre**. Partout ailleurs, la
technologie reste derrière le rideau ; ici, elle est le livrable.

| | |
|---|---|
| Ce que la personne obtient | Réponses, couverture, repère déclaratif si complet et piste de travail |
| Ce qui reste à établir | Pièces justificatives, priorité de décision et effets réellement mesurés |
| Suite possible | Examiner le besoin d'un audit ou d'une intervention, selon l'offre convenue |

## Lancer

Ouvrir `index.html` avec `diagnostic.js` et `app.js` à côté. Aucun serveur, aucune
installation, aucun fournisseur IA, aucune ressource externe (polices système,
scripts locaux) : la page fonctionne en `file://` sans réseau. Servie en ligne,
elle garde après la première visite une copie de ses fichiers (`sw.js`, réseau
d'abord) et se rouvre sans réseau ; une version publiée remplace la copie dès que
le réseau revient. Aucune réponse n'est mise en cache ni envoyée.

Les réponses se sauvegardent sur l'appareil quand le navigateur le permet. Si la
sauvegarde locale est bloquée (navigation privée stricte, cookies désactivés,
accès refusé), le questionnaire reste utilisable en mémoire et un message discret
indique que la progression ne sera pas conservée. Une sauvegarde illisible reste
intacte ; elle n'est jamais réécrite.

**Conserver le bilan (.md)** produit un fichier daté avec la version de méthode,
la marque, toutes les réponses et les inconnues. Il peut être ajouté aux sources
du bon dossier La Fusée, sans nouveau référentiel de scores. Le fichier est une
déclaration à examiner, pas une approbation ni une demande de génération.

Vérification sans dépendance (CI) : `node --test tests/*.test.cjs` — calcul,
empreinte des questions, stockage indisponible, absence de ressource externe et
copie hors ligne. Recette navigateur hors CI, Playwright requis mais non versionné :
`NODE_PATH=<node_modules contenant playwright> node tests/recette-navigateur.cjs`
(file://, réseau coupé, serveur arrêté, mise à jour publiée, trois indisponibilités
du stockage, sauvegarde illisible, parcours complet jusqu'au score).

## Les quatre axes

Le diagnostic porte sur les quatre piliers ADVE — **A**uthenticité, **D**istinction,
**V**aleur, **E**ngagement. Quatre questions par axe, seize au total. Le score composite
situe la marque sur une échelle de 0 à 5, et la prescription en découle.

## Rôle dans Shinkiro

Couche 01 · méthode. Voir [`shinkiro`](https://github.com/xtincell/shinkiro) pour
l'architecture du programme.

---

© Alexandre Djengue — UPgraders. Tous droits réservés. Voir [LICENSE](LICENSE).
