import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc, 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    where, 
    orderBy, 
    limit, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ==========================================
// 1. CONFIGURATION
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyBqdq0WxT__MEzsLalGzX-7WwjP592Ps4k",
    authDomain: "aptitudegame-28f6f.firebaseapp.com",
    projectId: "aptitudegame-28f6f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ==========================================
// 2. GLOBAL STATE
// ==========================================
let currentUserData = null;
let currentGameData = [];
let currentQIndex = 0;
let userScore = 0;
let currentContestId = null;
let timerInterval = null;
let timeLeft = 0;

// ==========================================
// 3. AUTHENTICATION
// ==========================================
const handleLogin = async () => {
    const email = document.getElementById("login-email").value;
    const pass = document.getElementById("login-pass").value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (e) { alert("Login Failed: " + e.message); }
};

const handleLogout = async () => {
    await signOut(auth);
    window.location.reload();
};

// ==========================================
// 4. NAVIGATION & SIDEBAR LOGIC
// ==========================================
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.onclick = (e) => {
            e.preventDefault();
            const target = link.getAttribute('data-target');
            
            // Toggle active class
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Switch Sections
            document.querySelectorAll('.view-section').forEach(s => s.style.display = 'none');
            document.getElementById(target).style.display = 'block';

            if (target === 'dash-contests') loadAttemptedContests();
            if (target === 'dash-insights') loadInsights();
            if (target === 'dash-leaderboard'){
                populateLeaderboardDropdown(); // Update list of contests
                loadRankings("global");
            }
        };
    });
}
// Function to fill the dropdown with existing contests
async function populateLeaderboardDropdown() {
    const contestGroup = document.getElementById("contest-options");
    if (!contestGroup) return;

    const snap = await getDocs(collection(db, "contests"));
    contestGroup.innerHTML = ""; // Clear existing

    snap.forEach(d => {
        const c = d.data();
        const opt = document.createElement("option");
        opt.value = d.id; // Use contest ID as the value
        opt.innerText = c.title;
        contestGroup.appendChild(opt);
    });
}

// Main function to fetch data based on selection
async function loadRankings(type = "global") {
    const tbody = document.querySelector("#leaderboard-table tbody");
    tbody.innerHTML = "<tr><td colspan='4'>Loading...</td></tr>";

    let q;
    if (type === "global") {
        // GLOBAL: Query users collection
        q = query(
            collection(db, "users"),
            where("role", "==", "student"),
            orderBy("totalScore", "desc"),
            limit(20)
        );
    } else {
        // CONTEST WISE: Query results collection for specific contest
        q = query(
            collection(db, "results"),
            where("contestId", "==", type),
            where("published", "==", true),
            orderBy("score", "desc")
        );
    }

    const snap = await getDocs(q);
    tbody.innerHTML = "";
    let rank = 1;

    if (snap.empty) {
        tbody.innerHTML = "<tr><td colspan='4'>No data available for this selection.</td></tr>";
        return;
    }

    // Process rows
    for (const docSnap of snap.docs) {
        const data = docSnap.data();
        let name, dept, points;

        if (type === "global") {
            name = data.name;
            dept = data.department;
            points = data.totalScore || 0;
        } else {
            // For contest-wise, we need to fetch the user's name from the users collection
            const userRef = doc(db, "users", data.userId);
            const userSnap = await getDoc(userRef);
            const userData = userSnap.data();
            name = userData?.name || "Student";
            dept = userData?.department || "N/A";
            points = data.score;
        }

        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>#${rank++}</strong></td>
            <td>${name}</td>
            <td>${dept}</td>
            <td><span class="badge-points">${points} pts</span></td>
        `;
        tbody.appendChild(row);
    }
}

// EVENT LISTENER for the dropdown
document.getElementById("leaderboard-filter").onchange = (e) => {
    loadRankings(e.target.value);
};
// ==========================================
// 5. DASHBOARD & INSIGHTS
// ==========================================
async function loadDashboard() {
    document.getElementById("auth-section").style.display = "none";
    document.getElementById("student-portal-wrapper").style.display = "flex";
    
    document.getElementById("dash-name").innerText = currentUserData.name;
    document.getElementById("dash-dept").innerText = currentUserData.department;
    document.getElementById("dash-year").innerText = currentUserData.year;
    document.getElementById("dash-score").innerText = currentUserData.totalScore || 0;
    document.getElementById("dash-events").innerText = currentUserData.eventsAttended || 0;

    loadContests();
}

async function loadInsights() {
    const resultsRef = collection(db, "results");
    // Filter by current user and published results
    const q = query(
        resultsRef, 
        where("userId", "==", auth.currentUser.uid), 
        where("published", "==", true), 
        orderBy("timestamp", "asc")
    );
    
    const snap = await getDocs(q);

    const scoreLabels = [];
    const scoreData = [];
    
    const activityMap = {}; // To store date -> count

    snap.forEach(d => {
        const data = d.data();
        const dateStr = new Date(data.timestamp?.toDate()).toLocaleDateString();
        
        // Data for Score Graph
        scoreLabels.push(dateStr);
        scoreData.push(data.score);

        // Data for Activity Graph
        activityMap[dateStr] = (activityMap[dateStr] || 0) + 1;
    });

    // Render Chart 1: Score Trend
    renderChart('scoreChart', scoreLabels, scoreData, 'Points', '#6366f1');

    // Render Chart 2: Activity Count
    const activityLabels = Object.keys(activityMap);
    const activityData = Object.values(activityMap);
    renderChart('attemptChart', activityLabels, activityData, 'Contests Attempted', '#f59e0b', 'bar');
}
function renderChart(id, labels, data, label, color, type = 'line') {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart to prevent flickering/overlap
    if (window[id + 'Instance']) window[id + 'Instance'].destroy();

    window[id + 'Instance'] = new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                borderColor: color,
                backgroundColor: type === 'bar' ? color : color + '22',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            },
            layout: {
        padding: {
            left: 10,
            right: 20,
            bottom: 20
        }
    }
        }

    });
}
// ==========================================
// 6. GAME ENGINE & LEVEL TRANSITION
// ==========================================
async function loadContests() {
    const container = document.getElementById("contest-list");
    const snap = await getDocs(collection(db, "contests"));
    container.innerHTML = "";

    snap.forEach(d => {
        const c = d.data();
        const div = document.createElement("div");
        div.className = "contest-item clay-card";
        div.innerHTML = `
            <h4>${c.title}</h4>
            <p>${c.instructions || 'Standard Rules Apply'}</p>
            <button class="btn-primary" id="btn-${d.id}">Enroll & Start</button>
        `;
        container.appendChild(div);
        document.getElementById(`btn-${d.id}`).onclick = () => enterGame(d.id, c);
    });
}

async function loadAttemptedContests() {
    const tbody = document.getElementById("attempted-list-body");
    if (!tbody) return;

    // 1. Fetch results for this user
    const q = query(
        collection(db, "results"), 
        where("userId", "==", auth.currentUser.uid),
        orderBy("timestamp", "desc")
    );
    
    const snap = await getDocs(q);
    tbody.innerHTML = "";

    if (snap.empty) {
        tbody.innerHTML = "<tr><td colspan='4'>No contests attempted yet.</td></tr>";
        return;
    }

    // 2. Process each result
    for (const resDoc of snap.docs) {
        const res = resDoc.data();
        
        // Fetch contest title (since results only store contestId)
        const conSnap = await getDoc(doc(db, "contests", res.contestId));
        const conTitle = conSnap.exists() ? conSnap.data().title : "Unknown Contest";
        
        const date = res.timestamp ? res.timestamp.toDate().toLocaleDateString() : "Pending";
        
        // Logic for Score and Rank (only if published)
        const scoreDisplay = res.published ? `<strong>${res.score}</strong>` : "<i>Hidden</i>";
        const rankDisplay = res.published ? (res.rank || "N/A") : "<i>Waiting...</i>";

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${conTitle}</td>
            <td>${date}</td>
            <td>${scoreDisplay}</td>
            <td>${rankDisplay}</td>
        `;
        tbody.appendChild(row);
    }
}
function enterGame(id, data) {
    currentContestId = id;
    currentGameData = data.questions || [];
    currentQIndex = 0;
    userScore = 0;
    timeLeft = data.timeLimit || 60;

    document.getElementById("student-portal-wrapper").style.display = "none";
    document.getElementById("game-arena").style.display = "flex";
    
    startTimer();
    renderQuestion();
}

function renderQuestion() {
    const q = currentGameData[currentQIndex];
    const totalQs = currentGameData.length;
    const currentLevel = Math.min(5, Math.ceil((currentQIndex + 1) / (totalQs / 5)));

    document.getElementById("level-indicator").innerText = `Level ${currentLevel} / 5`;
    document.getElementById("progress-fill").style.width = `${(currentQIndex / totalQs) * 100}%`;

    const area = document.getElementById("game-content");
    area.innerHTML = `
        <h2 style="margin-bottom:20px;">${q.q}</h2>
        <div class="options-grid" id="opt-container"></div>
    `;

    q.options.forEach(opt => {
        const btn = document.createElement("button");
        btn.className = "btn-option";
        btn.innerText = opt;
        btn.onclick = () => handleAnswer(opt, q.a || q.correct);
        document.getElementById("opt-container").appendChild(btn);
    });
}

function handleAnswer(selected, correct) {
    if (String(selected) === String(correct)) userScore += 10;

    const questionsPerLevel = Math.ceil(currentGameData.length / 5);
    
    // Check if Level Finished
    if ((currentQIndex + 1) % questionsPerLevel === 0 && (currentQIndex + 1) < currentGameData.length) {
        showLevelTransition();
    } else {
        nextStep();
    }
}

function showLevelTransition() {
    const area = document.getElementById("game-content");
    area.innerHTML = `
        <div class="level-complete-ui">
            <div class="stat-icon" style="margin: 0 auto 20px;"><i class="fa-solid fa-circle-check"></i></div>
            <h2>Level Completed!</h2>
            <p>You've mastered this section. Ready for the next one?</p>
            <button class="btn-primary" id="btn-next-lvl" style="margin-top:20px;">Continue to Next Level</button>
        </div>
    `;
    document.getElementById("btn-next-lvl").onclick = nextStep;
}

function nextStep() {
    currentQIndex++;
    if (currentQIndex < currentGameData.length) {
        renderQuestion();
    } else {
        finishGame();
    }
}

async function finishGame() {
    clearInterval(timerInterval);
    const userId = auth.currentUser.uid;

    document.getElementById("game-content").innerHTML = `
        <div class="level-complete-ui">
            <h2>Game Completed!</h2>
            <p>Score hidden until Admin publishes results.</p>
            <button class="btn-primary" onclick="window.location.reload()">Back to Home</button>
        </div>
    `;
    console.log(`User ${userId} finished with score: ${userScore}`);
    await addDoc(collection(db, "results"), {
        userId,
        contestId: currentContestId,
        score: userScore,
        published: false, // Critical: Hide score from student
        timestamp: serverTimestamp()
    });
}

// ==========================================
// 7. TIMER & INITIALIZATION
// ==========================================
function startTimer() {
    timerInterval = setInterval(() => {
        timeLeft--;
        const m = Math.floor(timeLeft / 60);
        const s = timeLeft % 60;
        document.getElementById("timer-display").innerText = `Time: ${m}:${s < 10 ? '0' : ''}${s}`;
        if (timeLeft <= 0) finishGame();
    }, 1000);
}
// Inside app.js

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
            const userData = snap.data();
            currentUserData = userData;

            if (userData.role === "admin") {
                window.location.href = "admin/index.html"; 
            } else {
                // 1. Unhide the dashboard container first
                const portal = document.querySelector(".portal-container");
                if (portal) {
                    portal.classList.remove("hidden");
                    portal.style.display = "flex";
                }
                document.getElementById("auth-section").classList.add("hidden");

                // 2. Load the content
                loadDashboard(); 

                // 3. CRITICAL: Initialize navigation listeners now that UI is visible
                setupNavigation(); 
            }
        }
    } else {
        switchSection("auth-section");
    }
});
document.getElementById("btn-login-submit").onclick = handleLogin;
document.getElementById("logout-trigger").onclick = handleLogout;