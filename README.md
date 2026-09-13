# 123Musique

Lecteur de musique local, hors-ligne et multiplateforme : importez vos fichiers audio (MP3 et autres), organisez-les en playlists, et reprenez la lecture exactement où vous l'aviez laissée.

Construit avec Expo (React Native) pour Android, iOS et web, et embarqué dans une coquille Electron pour les versions desktop (Windows, macOS, Linux) avec mises à jour automatiques.

## Fonctionnalités

- **Bibliothèque locale** : import multiple via le sélecteur de fichiers (avec détection des doublons), extraction automatique des tags ID3 (titre, artiste, album, année, pochette) et de la durée.
- **Lecture** : aléatoire, répétition (tout / titre), vitesse réglable, contrôle du volume, minuteur de sommeil, raccourcis clavier sur desktop (Espace, ← →, ↑ ↓).
- **Reprise de session** : morceau en cours, position, file d'attente et modes de lecture sont restaurés au redémarrage.
- **Playlists** : création, renommage, ajout/retrait, réordonnancement des titres.
- **Favoris** : marquez des titres d'un cœur et filtrez la bibliothèque sur eux.
- **File d'attente** : « Lire ensuite » et « Ajouter à la file » depuis la bibliothèque ; depuis le lecteur, voyez ce qui vient ensuite, sautez ou retirez des titres.
- **Thèmes** : sombre/clair, six couleurs d'accent.

## Démarrage

```bash
pnpm install
pnpm start          # serveur Expo (choisir Android / iOS / web)
pnpm lint           # ESLint
pnpm typecheck      # TypeScript
```

## Desktop (Electron)

```bash
pnpm desktop:dev            # dev : Expo web + Electron
pnpm desktop:build          # build de l'installeur de la plateforme courante
pnpm desktop:build:win      # ... ou ciblé : :mac, :linux
pnpm desktop:release        # publie une release GitHub (electron-updater)
```

## Android

Un workflow GitHub Actions construit un APK à chaque poussée sur `main` (voir `.github/workflows/build-android-apk.yml`).

## Structure

- `app/` — écrans (expo-router) : bibliothèque, playlists, réglages, lecteur, détail playlist, édition de titre.
- `contexts/` — état global : `MusicContext` (bibliothèque, lecture, persistance), `ThemeContext`, `UpdateContext`.
- `services/` — extraction de métadonnées (`metadata.ts`), mises à jour.
- `components/feature/` — mini-player, bannière de mise à jour, raccourcis clavier.
- `desktop/` — processus principal et preload Electron.

Ce projet est privé. Pour toute contribution, contactez l'auteur.
