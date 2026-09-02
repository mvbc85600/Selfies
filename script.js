// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAX3VP1XWnjTfD3lniuG2EvdDy_lh3kDhE",
    authDomain: "selfies-c6de9.firebaseapp.com",
    projectId: "selfies-c6de9",
    storageBucket: "selfies-c6de9.appspot.com",
    messagingSenderId: "491431782473",
    appId: "1:491431782473:web:822defb7265176458e7798"
};

// Initialiser Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();

// Variables globales
let photos = [];
let filteredPhotos = [];

// Charger les photos depuis Firestore
document.addEventListener('DOMContentLoaded', () => {
    loadPhotosFromFirebase();
    document.getElementById('photoForm').addEventListener('submit', handleFormSubmit);
});

async function loadPhotosFromFirebase() {
    const loading = document.getElementById('loading');
    loading.style.display = 'block';

    try {
        const querySnapshot = await db.collection("matchPhotos").orderBy("date", "desc").get();
        photos = [];
        querySnapshot.forEach((doc) => {
            photos.push({ id: doc.id, ...doc.data() });
        });
        filteredPhotos = [...photos];
        renderGallery();
        updateTeamFilter();
        updateIntegrationCode();
    } catch (error) {
        console.error("Erreur : ", error);
        alert("Erreur lors du chargement des photos.");
    } finally {
        loading.style.display = 'none';
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const teamInput = document.getElementById('team');
    const photoInput = document.getElementById('photo');
    const victoireCheckbox = document.getElementById('victoire');
    const matchNulCheckbox = document.getElementById('matchNul');
    const defaiteCheckbox = document.getElementById('defaite');
    const scoreInput = document.getElementById('score');
    const submitButton = document.getElementById('submitButton');

    const team = teamInput.value.trim();
    const file = photoInput.files[0];
    const isVictoire = victoireCheckbox.checked;
    const isMatchNul = matchNulCheckbox.checked;
    const isDefaite = defaiteCheckbox.checked;
    const score = scoreInput.value.trim();

    if (!file || !team || !score) {
        alert('Veuillez remplir tous les champs.');
        return;
    }

    if ((isVictoire && isMatchNul) || (isVictoire && isDefaite) || (isMatchNul && isDefaite)) {
        alert('Veuillez choisir UN SEUL résultat.');
        return;
    }

    submitButton.disabled = true;
    document.getElementById('loading').style.display = 'block';

    try {
        // Upload de l'image dans Firebase Storage
        const storageRef = storage.ref();
        const fileRef = storageRef.child(`matchPhotos/${Date.now()}_${file.name}`);
        const uploadTask = await fileRef.put(file);
        const imageUrl = await uploadTask.ref.getDownloadURL();

        // Ajouter les données dans Firestore
        await db.collection("matchPhotos").add({
            team: team,
            imageUrl: imageUrl,
            victoire: isVictoire,
            matchNul: isMatchNul,
            defaite: isDefaite,
            score: score,
            date: new Date().toISOString()
        });

        await loadPhotosFromFirebase();
        document.getElementById('photoForm').reset();
    } catch (error) {
        console.error("Erreur : ", error);
        alert("Erreur lors de l'upload.");
    } finally {
        submitButton.disabled = false;
        document.getElementById('loading').style.display = 'none';
    }
}

function renderGallery() {
    const gallery = document.getElementById('gallery');
    gallery.innerHTML = '';

    filteredPhotos.forEach((photo) => {
        const photoCard = document.createElement('div');
        photoCard.className = 'photo-card';
        photoCard.onclick = () => openModal(photo);

        const img = document.createElement('img');
        img.src = photo.imageUrl;
        img.alt = `${photo.team} - ${photo.score}`;

        const photoInfo = document.createElement('div');
        photoInfo.className = 'photo-info';

        const teamName = document.createElement('h3');
        teamName.textContent = photo.team;

        const score = document.createElement('div');
        score.className = 'score';
        score.textContent = `Score : ${photo.score}`;

        const result = document.createElement('div');
        result.className = 'result';

        if (photo.victoire) {
            result.textContent = 'Victoire';
            result.classList.add('result-victoire');
        } else if (photo.matchNul) {
            result.textContent = 'Match nul';
            result.classList.add('result-nul');
        } else if (photo.defaite) {
            result.textContent = 'Défaite';
            result.classList.add('result-defaite');
        }

        photoInfo.appendChild(teamName);
        photoInfo.appendChild(score);
        photoInfo.appendChild(result);
        photoCard.appendChild(img);
        photoCard.appendChild(photoInfo);
        gallery.appendChild(photoCard);
    });
}

function updateTeamFilter() {
    const teamFilter = document.getElementById('teamFilter');
    const teams = [...new Set(photos.map(photo => photo.team))];

    teamFilter.innerHTML = '<option value="all">🌍 Toutes les équipes</option>';
    teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team;
        option.textContent = team;
        teamFilter.appendChild(option);
    });
}

function filterPhotos() {
    const teamFilter = document.getElementById('teamFilter').value;
    const resultFilter = document.getElementById('resultFilter').value;

    filteredPhotos = photos.filter(photo => {
        const teamMatch = (teamFilter === 'all') || (photo.team === teamFilter);
        let resultMatch = true;

        if (resultFilter !== 'all') {
            if (resultFilter === 'Victoire') resultMatch = photo.victoire;
            if (resultFilter === 'Match nul') resultMatch = photo.matchNul;
            if (resultFilter === 'Défaite') resultMatch = photo.defaite;
        }

        return teamMatch && resultMatch;
    });

    renderGallery();
}

function openModal(photo) {
    const modal = document.getElementById('photoModal');
    const modalImage = document.getElementById('modalImage');
    const modalInfo = document.getElementById('modalInfo');

    modalImage.src = photo.imageUrl;

    let resultText = '';
    if (photo.victoire) resultText = '✅ Victoire';
    if (photo.matchNul) resultText = '⚖️ Match nul';
    if (photo.defaite) resultText = '❌ Défaite';

    modalInfo.innerHTML = `
        <strong>${photo.team}</strong><br>
        Score : ${photo.score}<br>
        ${resultText}
    `;

    modal.style.display = 'block';
}

function closeModal(event) {
    if (event.target.classList.contains('modal') || event.target.classList.contains('close')) {
        document.getElementById('photoModal').style.display = 'none';
    }
}

function getRecentPhotos() {
    const now = new Date();
    const fiveDaysAgo = new Date(now.getTime() - (5 * 24 * 60 * 60 * 1000));
    return photos.filter(photo => new Date(photo.date) >= fiveDaysAgo);
}

function updateIntegrationCode() {
    const integrationCode = document.getElementById('integrationCode');
    const recentPhotos = getRecentPhotos();

    if (recentPhotos.length === 0) {
        integrationCode.textContent = "Aucune photo dans les 5 derniers jours.";
        return;
    }

    let code = `<div style="display: flex; gap: 15px; flex-wrap: wrap; justify-content: center; background: #0a0a0a; padding: 15px; border-radius: 8px;">\n`;
    recentPhotos.forEach(photo => {
        let resultStyle = '';
        let resultText = '';
        if (photo.victoire) {
            resultStyle = `background: rgba(76, 175, 80, 0.2); border: 1px solid #4caf50; color: #4caf50;`;
            resultText = 'Victoire';
        } else if (photo.matchNul) {
            resultStyle = `background: rgba(255, 193, 7, 0.2); border: 1px solid #ffc107; color: #ffc107;`;
            resultText = 'Match nul';
        } else if (photo.defaite) {
            resultStyle = `background: rgba(244, 67, 54, 0.2); border: 1px solid #f44336; color: #f44336;`;
            resultText = 'Défaite';
        }

        code += `
    <div style="background: #121212; border-radius: 8px; padding: 8px; border: 1px solid rgba(255, 255, 255, 0.1); max-width: 250px;">
        <img src="${photo.imageUrl}" style="width: 100%; height: 160px; object-fit: cover; border-radius: 6px; margin-bottom: 8px;">
        <div style="padding: 0 8px;">
            <div style="color: #e0e0e0; font-weight: bold;">${photo.team}</div>
            <div style="color: #4caf50;">Score : ${photo.score}</div>
            <div style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 0.85rem; ${resultStyle}">${resultText}</div>
        </div>
    </div>\n`;
    });
    code += `</div>`;
    integrationCode.textContent = code;
}

function copyIntegrationCode() {
    const codeElement = document.getElementById('integrationCode');
    navigator.clipboard.writeText(codeElement.textContent)
        .then(() => alert('Code copié !'))
        .catch(err => console.error('Erreur : ', err));
}
