
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } 
    from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs, query, where, updateDoc,serverTimestamp } 
    from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBqdq0WxT__MEzsLalGzX-7WwjP592Ps4k",
  authDomain: "aptitudegame-28f6f.firebaseapp.com",
  projectId: "aptitudegame-28f6f",
  storageBucket: "aptitudegame-28f6f.firebasestorage.app",
  messagingSenderId: "998298411933",
  appId: "1:998298411933:web:c5251b6c8ade05008ac574",
  measurementId: "G-QVSB8EZDD5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);      
const db = getFirestore(app);  



// Global State
let currentUser = null;
let currentGameData = [];
let currentQIndex = 0;
let userScore = 0;
let timerInterval = null;

window.switchSection = (targetId) => {
    const sections = ['auth-section', 'student-dashboard', 'admin-dashboard', 'game-arena'];
    
    sections.forEach(id => {
        const el = document.getElementById(id);
        if(el.style.display !== 'none') {
            gsap.to(`#${id}`, {
                opacity: 0, 
                y: -20, 
                duration: 0.3, 
                onComplete: () => el.style.display = 'none'
            });
        }
    });

    setTimeout(() => {
        const target = document.getElementById(targetId);
        target.style.display = (targetId === 'auth-section' || targetId === 'game-arena') ? 'flex' : 'block';
        
        if(targetId.includes('dashboard')) target.style.display = 'block';

        gsap.fromTo(`#${targetId}`, 
            { opacity: 0, y: 20 }, 
            { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
        );
       
        const nav = document.getElementById('navbar');
        if(targetId === 'auth-section') nav.style.display = 'none';
        else {
            nav.style.display = 'flex';
            gsap.fromTo("#navbar", {y: -50, opacity:0}, {y: 0, opacity:1, duration: 0.5});
        }

    }, 300);
};

window.toggleAuth = (mode) => {
    const loginForm = document.getElementById('login-form');
    const regForm = document.getElementById('register-form');
    
    if (mode === 'register') {
        gsap.to(loginForm, {x: -50, opacity: 0, display: 'none', duration: 0.3});
        gsap.fromTo(regForm, {x: 50, opacity: 0, display: 'block'}, {x: 0, opacity: 1, display: 'block', duration: 0.3, delay: 0.1});
    } else {
        gsap.to(regForm, {x: 50, opacity: 0, display: 'none', duration: 0.3});
        gsap.fromTo(loginForm, {x: -50, opacity: 0, display: 'block'}, {x: 0, opacity: 1, display: 'block', duration: 0.3, delay: 0.1});
    }
};

const emailRegex = /^[a-zA-Z]+\.(\d{2})([a-zA-Z]+)@sonatech\.ac\.in$/;

window.registerUser = async () => {
    const name = document.getElementById('reg-name').value;
    const regNo = document.getElementById('reg-no').value;
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-pass').value;

    const urlParams = new URLSearchParams(window.location.search);
    const inviteCode = urlParams.get("invite");

   if(inviteCode){
    await updateDoc(doc(db,"adminInvites",inviteCode),{used:true});
    await updateDoc(doc(db,"users",userCred.user.uid),{role:"admin"});
   }

    if (!name || !regNo || !pass) return Swal.fire("Error", "All fields are required", "warning");

    const match = email.match(emailRegex);
    if (!match) {
        return Swal.fire({
            icon: 'error',
            title: 'Invalid Email',
            text: 'Email must follow format: name.yeardept@sonatech.ac.in',
            background: '#1e293b',
            color: '#fff'
        });
    }

    const year = "20" + match[1];
    const dept = match[2].toUpperCase();

   try {
        const userCred = await createUserWithEmailAndPassword(auth, email, pass);
        console.log("1. Auth account created successfully:", userCred.user.uid);
        
        const match = email.match(emailRegex);
        const year = "20" + match[1];
        const dept = match[2].toUpperCase();

        console.log("2. Attempting to write to Firestore...");

        await setDoc(doc(db, "users", userCred.user.uid), {
            name: name,
            registerNumber: regNo,
            email: email,
            year: year,
            department: dept,
            role: "student",
            eventsAttended: 0,
            createdAt: serverTimestamp()
        });

        console.log("3. Firestore document written successfully!");
        Swal.fire({icon: 'success', title: 'Identity Verified'});

    } catch (error) {
        console.error("CRITICAL REGISTRATION ERROR:", error.code, error.message);
        Swal.fire({icon: 'error', title: 'Error', text: error.message});
    }
};

window.loginUser = async () => {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;

    try {
        await signInWithEmailAndPassword(auth, email, pass);
       
    } catch (error) {
        Swal.fire({icon: 'error', title: 'Access Denied', text: 'Invalid Credentials', background: '#1e293b', color: '#fff'});
    }
};

window.logout = () => {
    signOut(auth).then(() => {
        location.reload();
    });
};
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("User authenticated:", user.email); 

        try {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                console.log("Database profile found. Loading dashboard...");
                currentUser = docSnap.data();
                currentUser.uid = user.uid;

                const display = document.getElementById('user-display');
                if(display) display.innerHTML = `<i class="fa-solid fa-user-astronaut"></i> ${currentUser.name}`;
                
                if (currentUser.role === 'admin' || currentUser.role === 'superadmin') {
                    loadAdminDashboard();
                } else {
                    loadStudentDashboard();
                }
            } else {
                console.error("User exists in Auth but not in Database!");
                Swal.fire({
                    icon: 'error',
                    title: 'Profile Not Found',
                    text: 'Your account login works, but your student profile is missing from the database. Please register again with a new email or contact admin.',
                    confirmButtonText: 'Logout',
                    preConfirm: () => logout()
                });
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
            Swal.fire("System Error", "Could not connect to database. Check console.", "error");
        }
    } else {
        console.log("No user logged in.");
        switchSection('auth-section');
    }
});


function loadStudentDashboard() {
    switchSection('student-dashboard');
    
    document.getElementById('dash-name').innerText = currentUser.name;
    document.getElementById('dash-dept').innerText = currentUser.department;
    document.getElementById('dash-year').innerText = currentUser.year;
    document.getElementById('dash-events').innerText = currentUser.eventsAttended;

    fetchContests();
    loadLeaderboard();
}

async function fetchContests() {

    const container = document.getElementById('contest-list');
    container.innerHTML = '';

    const newWrap = document.createElement('div');
    newWrap.className = 'mission-section';

    const completedWrap = document.createElement('div');
    completedWrap.className = 'mission-section';

    newWrap.innerHTML = `<h3 class="mission-title"><i class="fa-solid fa-rocket"></i> New Contests</h3>
                        <div class="grid-container" id="new-grid"></div>`;

    completedWrap.innerHTML = `<h3 class="mission-title"><i class="fa-solid fa-circle-check"></i> Completed Contests</h3>
                              <div class="grid-container" id="done-grid"></div>`;

    container.appendChild(newWrap);
    container.appendChild(completedWrap);

    const newGrid = document.getElementById('new-grid');
    const doneGrid = document.getElementById('done-grid');

    const querySnapshot = await getDocs(collection(db, "contests"));

    querySnapshot.forEach((docSnap) => {

        const data = docSnap.data();
        const isCompleted =
            currentUser.completedContests &&
            currentUser.completedContests.includes(docSnap.id);

        const card = document.createElement('div');
        card.className = 'glass-card hover-card';

        card.innerHTML = `
            <h3><i class="fa-solid fa-trophy"></i> ${data.title}</h3>
            <p style="color:#ccc">${data.instructions}</p>
            <button class="btn-neon">${isCompleted ? "COMPLETED" : "START CONTEST"}</button>
        `;

        const btn = card.querySelector('button');

        if(isCompleted){
            card.classList.add('completed-card');
            btn.className = 'btn-complete';
            btn.disabled = true;
            doneGrid.appendChild(card);
        } else {
            btn.onclick = () => enterContest(docSnap.id);
            newGrid.appendChild(card);
        }
    });
}

async function loadLeaderboard(){

    const table = document.querySelector("#leaderboard-table tbody");

    if(!table) return;

    table.innerHTML = "<tr><td colspan='4'>Loading...</td></tr>";

    const snap = await getDocs(collection(db,"users"));

    let players = [];

    snap.forEach(doc=>{
        const u = doc.data();

        if(u.role === "student"){
            players.push({
                name: u.name,
                dept: u.department,
                score: u.totalScore || 0
            });
        }
    });

    players.sort((a,b)=>b.score-a.score);

    table.innerHTML = "";

    if(players.length === 0){
        table.innerHTML =
          "<tr><td colspan='4'>No data yet</td></tr>";
        return;
    }

    players.forEach((p,i)=>{
        table.innerHTML += `
            <tr>
                <td>${i+1}</td>
                <td>${p.name}</td>
                <td>${p.dept}</td>
                <td>${p.score}</td>
            </tr>
        `;
    });
}


window.enterContest = async (contestId) => {

    const docRef = doc(db, "contests", contestId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return;
    
    const data = docSnap.data();
    currentGameData = data.questions;
    currentQIndex = 0;
    userScore = 0;

await addDoc(collection(db,"registrations"),{
    userId: currentUser.uid,
    contestId: contestId,
    startedAt: serverTimestamp()
});


    switchSection('game-arena');
    
    renderGamifiedQuestion();
    startTimer(10 * 60);

};

function startTimer(duration) {
    let timer = duration, minutes, seconds;
    const display = document.querySelector('.timer');
    clearInterval(timerInterval);
    
    timerInterval = setInterval(function () {
        minutes = parseInt(timer / 60, 10);
        seconds = parseInt(timer % 60, 10);

        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;

        display.textContent = minutes + ":" + seconds;

        if (--timer < 0) {
            clearInterval(timerInterval);
            finishGame(true); 
        }
    }, 1000);
}

window.allowDrop = (ev) => { ev.preventDefault(); };
window.dragStart = (ev) => { ev.dataTransfer.setData("text", ev.target.dataset.value); };
window.dropAnswer = (ev) => {
    ev.preventDefault();
    const data = ev.dataTransfer.getData("text");
    const target = ev.target;
    target.innerText = data;
    target.classList.add('filled');
    setTimeout(() => { window.handleAnswer(data); }, 500);
};

function renderGamifiedQuestion(){

    if(currentQIndex >= currentGameData.length){
        finishGame();
        return;
    }

    const qData = currentGameData[currentQIndex];

    const contentArea = document.getElementById("game-content");
    const progressBar = document.getElementById("game-progress");

    progressBar.style.width =
        ((currentQIndex)/currentGameData.length*100)+"%";

    contentArea.innerHTML="";

    const gameCard=document.createElement("div");
    gameCard.className="gamified-card-full";

    const title=document.createElement("h2");
    title.className="question-text";
    title.innerText=qData.q;

    gameCard.appendChild(title);

    /* ================= PUZZLE ZONE ================= */

    const interaction=document.createElement("div");
    interaction.className="interaction-area-center";

    const drop=document.createElement("div");
    drop.className="grid-tile target-slot";
    drop.innerText="?";

    drop.ondragover=(e)=>e.preventDefault();

    drop.ondrop=(e)=>{
        const val=e.dataTransfer.getData("text");
        drop.innerText=val;

        setTimeout(()=>{
            userScore+=10;
            currentQIndex++;
            renderGamifiedQuestion();
        },500);
    };

    interaction.appendChild(drop);

    gameCard.appendChild(interaction);


    const inventory=document.createElement("div");
    inventory.className="inventory-section";

    const row=document.createElement("div");
    row.className="inventory-row";

    (qData.options || []).forEach(opt=>{
        const tile=document.createElement("div");
        tile.className="drag-tile-item";
        tile.draggable=true;
        tile.innerText=opt;

        tile.ondragstart=(e)=>{
            e.dataTransfer.setData("text",opt);
        };

        row.appendChild(tile);
    });

    inventory.appendChild(row);
    gameCard.appendChild(inventory);

    contentArea.appendChild(gameCard);
}


window.exitGame = () => {
    Swal.fire({
        title: 'Abort Mission?',
        text: "Progress will be lost.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, Exit',
        background: '#1e293b',
        color: '#fff'
    }).then((result) => {
        if (result.isConfirmed) {
            clearInterval(timerInterval);
            switchSection('student-dashboard');
        }
    });
};

async function finishGame(timeOut = false) {
    clearInterval(timerInterval);
    
    // 1. Force a UI refresh for the result
    const contentArea = document.getElementById('game-content');
    contentArea.innerHTML = `
        <div class="result-card">
            <h1>${timeOut ? "MISSION FAILED" : "LEVEL COMPLETED"}</h1>
            <p>Score: ${userScore}</p>
            <button class="btn-neon" onclick="location.reload()">BACK TO HUB</button>
        </div>
    `;

    console.log("Starting finishGame process...");
    console.log("Current UID:", currentUser.uid);
    console.log("Score to add:", userScore);

    try {
        const userRef = doc(db, "users", currentUser.uid);

        // 2. SET with MERGE (This fixes the "not updating" issue if the doc doesn't exist)
        // It will either update totalScore or create it if missing.
        await setDoc(userRef, {
            totalScore: increment(userScore),
            eventsAttended: increment(1),
            lastActive: serverTimestamp()
        }, { merge: true });

        console.log("✅ Firestore totalScore updated successfully!");

        // 3. Update local state
        currentUser.totalScore = (currentUser.totalScore || 0) + userScore;

        // 4. Record the specific level attempt
        await addDoc(collection(db, "registrations"), {
            userId: currentUser.uid,
            contestId: currentContestId,
            score: userScore,
            timestamp: serverTimestamp()
        });
        
        console.log("✅ Registration recorded!");

    } catch (error) {
        console.error("❌ CRITICAL ERROR:", error.code, error.message);
        if (error.code === 'permission-denied') {
            alert("Firebase Rules are blocking the write! Check your Security Rules.");
        }
    }

    if (typeof loadLeaderboard === "function") loadLeaderboard();
}

function loadAdminDashboard() {
    switchSection('admin-dashboard');
}

window.showAdminTab = (tabName) => {
    document.querySelectorAll('.admin-panel').forEach(el => el.style.display = 'none');
    document.getElementById(`admin-${tabName}`).style.display = 'block';

    
    if(tabName === 'students') fetchAllStudents();
    if(tabName === "results") loadAdminResults()
};

window.createContest = async () => {
    
    const title = document.getElementById('contest-title').value;
    
    const start = document.getElementById('contest-start').value;
    const end = document.getElementById('contest-end').value;
    const instructions = document.getElementById('contest-instructions').value;
    
    const questionsRaw = document.getElementById('contest-questions').value;

    if(!title || !questionsRaw) return Swal.fire("Error", "Missing Mission Data", "error");

    try {
        const questionsJson = JSON.parse(questionsRaw);
        
        await addDoc(collection(db, "contests"), {
            title: title,
            startTime: start,
            endTime: end,
            instructions: instructions,
            questions: questionsJson, 
            status: "ACTIVE", 
            createdAt: serverTimestamp()
        });
        
        Swal.fire({
            title: 'MISSION DEPLOYED', 
            text: 'The operation is now live on all student terminals.', 
            icon: 'success',
            background: '#0f172a', 
            color: '#38bdf8'
        });
        
    } catch (e) {
        Swal.fire("Data Error", "Your JSON formatting is incorrect.", "error");
    }
};
async function fetchAllStudents() {
    const tbody = document.querySelector('#students-table tbody');
    tbody.innerHTML = '<tr><td colspan="4">Decrypting Database...</td></tr>';

    const q = query(collection(db, "users"), where("role", "==", "student"));
    const querySnapshot = await getDocs(q);
    
    window.allStudents = []; 
    querySnapshot.forEach(doc => window.allStudents.push(doc.data()));
    
    renderStudentTable(window.allStudents);
}

window.filterStudents = () => {
    const deptFilter = document.getElementById('filter-dept').value;
   
    const filtered = window.allStudents.filter(s => {
        return (deptFilter === 'ALL' || s.department === deptFilter);
    });
    renderStudentTable(filtered);
};

function renderStudentTable(students) {
    const tbody = document.querySelector('#students-table tbody');
    tbody.innerHTML = "";
    
    if(students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">No agents found.</td></tr>';
        return;
    }

    students.forEach(s => {
        tbody.innerHTML += `
            <tr>
                <td><span class="agent-name">${s.name}</span></td>
                <td>${s.registerNumber}</td>
                <td><span class="dept-tag">${s.department}</span></td>
                <td>${s.totalScore}</td>
            </tr>
        `;
    });
}

window.generateAdminInvite = async () => {

    const code = Math.random().toString(36).substring(2,8);

    await setDoc(doc(db,"adminInvites",code),{
        createdAt: serverTimestamp(),
        used:false
    });

    const link = `${location.origin}/index.html?invite=${code}`;

    Swal.fire({
        title:"Admin Invite Link",
        html:`<input value="${link}" style="width:100%">`,
        icon:"success"
    });
};
async function loadAdminResults(){

    const area = document.getElementById("result-table-area");

    area.innerHTML = "Loading...";

    const snap = await getDocs(collection(db,"results"));

    if(snap.empty){
        area.innerHTML = "<p>No results yet</p>";
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Dept</th>
                    <th>Score</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;

    snap.forEach(doc=>{
        const r = doc.data();

        html += `
            <tr>
                <td>${r.name}</td>
                <td>${r.department}</td>
                <td>${r.score}</td>
                <td style="color:${r.passed ? '#22c55e':'#ef4444'}">
                    ${r.passed ? 'PASS':'FAIL'}
                </td>
            </tr>
        `;
    });

    html += "</tbody></table>";

    area.innerHTML = html;
}
window.goToNextLevel = () => {
    switchSection('student-dashboard');
    fetchContests();
};
