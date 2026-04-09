#!/usr/bin/env node

/**
 * Script d'upload des vidéos tutoriels vers Supabase Storage
 * Usage: node scripts/upload-videos.js
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Configuration Supabase
const SUPABASE_URL = 'https://wikgdksyeygwpmqzmhez.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sakHYR_n46YFOq4msulssg_ahtXvacU';
const BUCKET_NAME = 'videos';

// Vidéos à uploader
const VIDEOS = [
  { file: '1. Tu es bon. Personne ne le sait._1080p.mp4', title: 'Tu es bon. Personne ne le sait.' },
  { file: '2. Ton profil, c\'est ton CV vivant_1080p.mp4', title: 'Ton profil, c\'est ton CV vivant' },
  { file: '3. Pourquoi lui il est toujours plein et toi tu attends_1080p.mp4', title: 'Pourquoi lui il est toujours plein et toi tu attends' },
  { file: '4. Le client qui était à 200 mètres ne te savait pas là.mp4', title: 'Le client qui était à 200 mètres ne te savait pas là' },
  { file: '5. Tu cherches du travail - KalaTogo aussi c\'est pour toi.mp4', title: 'Tu cherches du travail - KalaTogo aussi c\'est pour toi' },
  { file: '6.  Ton CV en 1 clic. Sérieusement..mp4', title: 'Ton CV en 1 clic. Sérieusement.' },
  { file: '7. 2 500 FCFA. Ce que tu peux débloquer avec ça._1080p.mp4', title: '2 500 FCFA. Ce que tu peux débloquer avec ça.' },
  { file: '8. Tu veux embaucher - T\'as plus d\'excuse._1080p.mp4', title: 'Tu veux embaucher - T\'as plus d\'excuse.' },
  { file: '9. Arrete de gerer  ton activité à l\'aveugle. mp4.mp4', title: 'Arrête de gérer ton activité à l\'aveugle' },
  { file: '10. Explication fonctionnalité .mp4', title: 'Explication des fonctionnalités' }
];

const videosDir = path.join(__dirname, '../videos');

async function uploadVideo(videoPath, videoFile, videoTitle) {
  try {
    const fileBuffer = fs.readFileSync(videoPath);
    const fileName = `video-${Date.now()}-${path.basename(videoFile).replace(/\s+/g, '-')}`;

    const response = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${fileName}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'video/mp4',
        },
        body: fileBuffer
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const publicURL = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${fileName}`;
    console.log(`✅ ${videoTitle}`);
    console.log(`   URL: ${publicURL}\n`);

    return {
      title: videoTitle,
      file: videoFile,
      url: publicURL,
      fileName: fileName
    };
  } catch (error) {
    console.error(`❌ Erreur upload ${videoFile}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🎬 Démarrage upload vidéos vers Supabase Storage...\n');

  const uploadedVideos = [];

  for (const video of VIDEOS) {
    const videoPath = path.join(videosDir, video.file);

    if (!fs.existsSync(videoPath)) {
      console.warn(`⚠️  Fichier non trouvé: ${video.file}`);
      continue;
    }

    const result = await uploadVideo(videoPath, video.file, video.title);
    if (result) {
      uploadedVideos.push(result);
    }
  }

  // Sauvegarder les URLs dans un fichier JSON
  const configFile = path.join(__dirname, '../videos-config.json');
  fs.writeFileSync(configFile, JSON.stringify(uploadedVideos, null, 2));

  console.log(`\n✅ Configuration sauvegardée: ${configFile}`);
  console.log(`📊 Total: ${uploadedVideos.length}/${VIDEOS.length} vidéos uploadées`);
}

main().catch(console.error);
