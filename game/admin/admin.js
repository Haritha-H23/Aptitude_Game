import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, getDoc, updateDoc, collection, increment,
    addDoc, getDocs, query, where, serverTimestamp, deleteDoc 
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

document.getElementById('admin-logout').onclick = async () => {
    try {
        localStorage.removeItem('activeAdminTab');
        
        await signOut(auth);
        
        window.location.replace("../index.html"); 
    } catch (error) {
        console.error("Logout failed:", error);
    }
};

onAuthStateChanged(auth, (user) => {
    if (!user) {
        // If no user is detected, redirect immediately
        window.location.replace("../index.html");
    }
});
// ==========================================
// 2. NAVIGATION & TAB SWITCHING
// ==========================================
window.showTab = (tabId) => {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    // Set clicked button as active
    const btn = Array.from(document.querySelectorAll('.nav-btn')).find(b => b.getAttribute('onclick').includes(tabId));
    if(btn) btn.classList.add('active');

    // Refresh data based on tab
    if(tabId === 'dash-tab') loadDashboardStats();
    if(tabId === 'students-tab') loadStudentInsights();
    if(tabId === 'results-tab') loadPendingResults();
    if(tabId === 'manager-tab') populateContestDropdown();
};

// ==========================================
// 3. AUTHENTICATION (ADMIN ONLY)
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html"; // Redirect if not logged in
        return;
    }

    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists() || snap.data().role !== 'admin') {
        alert("Access Denied: Admin Credentials Required.");
        window.location.href = "index.html";
    } else {
        loadDashboardStats();
    }
});



// ==========================================
// 4. QUESTION & CONTEST MANAGER
// ==========================================

// Save or Create a Contest
document.getElementById('save-contest-btn').onclick = async () => {
    const title = document.getElementById('con-title').value;
    const instr = document.getElementById('con-instr').value;
    const time = document.getElementById('con-time').value;

    if(!title || !time) return alert("Fill Contest Title and Time Limit");

    try {
        await addDoc(collection(db, "contests"), {
            title,
            instructions: instr,
            isPublished: false,
            timeLimit: parseInt(time),
            questions: [], // Start with empty array
            createdAt: serverTimestamp()
        });
        alert("Contest Created Successfully!");
        populateContestDropdown();
    } catch (e) { console.error(e); }
};

// Add Question to existing Contest
document.getElementById('add-q-btn').onclick = async () => {
    const QUESTIONS_PER_LEVEL = 10;
    const TOTAL_LEVELS = 5;
    const totalQuestionsNeeded = QUESTIONS_PER_LEVEL * TOTAL_LEVELS;
    const contestId = document.getElementById('target-contest-select').value;
    const qText = document.getElementById('q-text').value;
    const opts = [
        document.getElementById('opt-a').value,
        document.getElementById('opt-b').value,
        document.getElementById('opt-c').value,
        document.getElementById('opt-d').value
    ];
    const correct = document.getElementById('q-correct').value;

    if(!contestId || !qText || !correct) return alert("Fill all question fields");

    const contestRef = doc(db, "contests", contestId);
    const snap = await getDoc(contestRef);
    const currentQuestions = snap.data().questions || [];

    currentQuestions.push({
        q: qText,
        options: opts,
        a: document.getElementById(`opt-${correct.toLowerCase()}`).value,
        level: Math.ceil((currentQuestions.length + 1) / (totalQuestionsNeeded / 5))
    });

    await updateDoc(contestRef, { questions: currentQuestions });
    alert("Question Added to Bank!");
    document.getElementById('q-text').value = ""; // Clear form
};

async function populateContestDropdown() {
    const select = document.getElementById('target-contest-select');
    select.innerHTML = '<option value="">Select Contest</option>';
    const snap = await getDocs(collection(db, "contests"));
    snap.forEach(d => {
        select.innerHTML += `<option value="${d.id}">${d.data().title}</option>`;
    });
}

// ==========================================
// 5. STUDENT INSIGHTS & EXPORT
// ==========================================

async function loadStudentInsights() {
    const tbody = document.getElementById('student-list-body');
    tbody.innerHTML = "<tr><td colspan='6'>Fetching students...</td></tr>";
    
    const snap = await getDocs(query(collection(db, "users"), where("role", "==", "student")));
    tbody.innerHTML = "";

    snap.forEach(d => {
        const u = d.data();
        tbody.innerHTML += `
            <tr>
                <td>${u.name}</td>
                <td>${u.registerNumber}</td>
                <td>${u.department}</td>
                <td>${u.year}</td>
                <td>${u.totalScore || 0}</td>
                <td><button onclick="deleteUser('${d.id}')" style="color:red; border:none; background:none; cursor:pointer;"><i class="fa-solid fa-trash"></i></button></td>
            </tr>
        `;
    });
}

window.exportStudentData = () => {
    let csv = "Name,Register No,Department,Year,Total Points\n";
    document.querySelectorAll("#student-master-table tr").forEach((row, i) => {
        if(i === 0) return;
        const cols = row.querySelectorAll("td");
        const data = Array.from(cols).map(c => c.innerText).slice(0, 5).join(",");
        csv += data + "\n";
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'Sonatech_Students_Report.csv');
    a.click();
};

// ==========================================
// 6. RESULT PUBLISHING (UNLOCK LEADERBOARD)
// ==========================================

async function loadPendingResults() {
    const tbody = document.getElementById('pending-results-body');
    tbody.innerHTML = "";
    
    const resultsSnap = await getDocs(collection(db, "results"));
    const contestsSnap = await getDocs(collection(db, "contests"));
    const usersSnap = await getDocs(collection(db, "users"));

    const contests = {}; contestsSnap.forEach(d => contests[d.id] = d.data().title);
    const users = {}; usersSnap.forEach(d => users[d.id] = d.data().name);

    resultsSnap.forEach(d => {
        const r = d.data();
        const statusClass = r.published ? 'badge-published' : 'badge-pending';
        const statusText = r.published ? 'Published' : 'Awaiting Approval';

        tbody.innerHTML += `
            <tr>
                <td>${users[r.userId] || 'Unknown'}</td>
                <td>${contests[r.contestId] || 'Deleted Contest'}</td>
                <td>${r.score}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn-primary" style="padding:5px 10px; font-size:12px;" onclick="togglePublish('${d.id}', ${!r.published})">
                        ${r.published ? 'Unpublish' : 'Approve & Publish'}
                    </button>
                </td>
            </tr>
        `;
    });
}

// Function for individual "Approve & Publish" buttons in the table
window.togglePublish = async (id, status) => {
    // 1. Safety Check: Ensure ID exists
    if (!id || typeof id !== 'string') {
        console.error("Invalid ID passed to togglePublish:", id);
        return;
    }

    try {
        const resultRef = doc(db, "results", id);
        const snap = await getDoc(resultRef);
        
        if (!snap.exists()) {
            throw new Error("Result document does not exist");
        }

        const data = snap.data();

        // 2. Update the result status
        await updateDoc(resultRef, { published: status });

        // 3. Update Student Stats only if status is true (Publishing)
        // We check if userId exists to avoid the 'indexOf' error on userRef
        if (status === true && data.userId) {
            const userRef = doc(db, "users", data.userId);
            await updateDoc(userRef, {
                totalScore: increment(Number(data.score) || 0),
                eventsAttended: increment(1)
            });  
        }
        alert(status ? "Result Published!" : "Result Unpublished!");
        loadPendingResults(); // Refresh your table

    } catch (error) {
        console.error("Error toggling publish:", error);
        alert("Action failed. Check console for details.");
    }
};
// Function for the "Publish All" button
document.getElementById("publish-all-btn").onclick = async () => {
    if (!confirm("Publish all pending results? This will update student total scores.")) return;

    try {
        const q = query(collection(db, "results"), where("published", "==", false));
        const snap = await getDocs(q);

        if (snap.empty) {
            alert("No pending results found.");
            return;
        }

        const batch = writeBatch(db);

        snap.forEach((resDoc) => {
            const data = resDoc.data();
            const resultRef = doc(db, "results", resDoc.id);
            const userRef = doc(db, "users", data.userId);

            // Update result status
            batch.update(resultRef, { published: true });

            // Increment student stats
            batch.update(userRef, {
                totalScore: increment(data.score || 0),
                eventsAttended: increment(1)
            });
        });

        await batch.commit();
        alert("All results published successfully!");
        loadPendingResults();
    } catch (error) {
        console.error("Batch publish failed:", error);
    }
};
// ==========================================
// 7. DASHBOARD STATS
// ==========================================

// Ensure doc and getDoc are imported at the top of your file
// import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";

async function loadDashboardStats() {
    try {
        const studentsSnap = await getDocs(query(collection(db, "users"), where("role", "==", "student")));
        const contestsSnap = await getDocs(collection(db, "contests"));
        const resultsSnap = await getDocs(collection(db, "results"));

        // Update basic cards
        if(document.getElementById('total-students')) document.getElementById('total-students').innerText = studentsSnap.size;
        if(document.getElementById('active-contests')) document.getElementById('active-contests').innerText = contestsSnap.size;

        let totalPass = 0;
        let deptStats = [0, 0, 0, 0, 0]; // CSD, CSE, ECE, IT, MECH
        const deptMap = { "CSD": 0, "CSE": 1, "ECE": 2, "IT": 3, "MECH": 4 };

        // Process results for Pass/Fail and fetch Departments
        const processingTasks = resultsSnap.docs.map(async (resDoc) => {
            const resData = resDoc.data();
            const score = Number(resData.score) || 0;

            // 1. Calculate Pass Rate
            if (score >= 50) totalPass++;

            // 2. Lookup Department from Users Collection
            if (resData.userId) {
                try {
                    const userDocRef = doc(db, "users", resData.userId);
                    const userDocSnap = await getDoc(userDocRef);
                    
                    if (userDocSnap.exists()) {
                        const uDept = (userDocSnap.data().department || "").toUpperCase().trim();
                        if (deptMap[uDept] !== undefined) {
                            deptStats[deptMap[uDept]]++;
                        }
                    }
                } catch (e) {
                    console.warn("Could not fetch dept for user:", resData.userId);
                }
            }
        });

        // Wait for all lookups to finish
        await Promise.all(processingTasks);

        // Update Pass Rate UI Card
        const rate = resultsSnap.size ? Math.round((totalPass / resultsSnap.size) * 100) : 0;
        if(document.getElementById('avg-pass-rate')) document.getElementById('avg-pass-rate').innerText = rate + "%";

        // --- RENDER BOTH CHARTS ---
        // Ensure these functions exist in your admin.js!
        renderPassFailChart(totalPass, resultsSnap.size - totalPass);
        renderAdminCharts(deptStats);

    } catch (error) {
        console.error("Dashboard Stats Error:", error);
    }
}
function renderPassFailChart(passes, fails) {
    const ctx = document.getElementById('passFailChart').getContext('2d');
    
    // Destroy existing chart instance if it exists to prevent overlap
    if (window.pfChart) window.pfChart.destroy();

    window.pfChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pass', 'Fail'],
            datasets: [{
                data: [passes, fails],
                backgroundColor: ['#3CBDA8', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

let deptChartInstance = null;

function renderAdminCharts(deptStats) {
    const deptCtx = document.getElementById('deptChart');
    if (!deptCtx) return;

    // 1. Destroy existing chart to prevent "Canvas already in use" error
    if (deptChartInstance) {
        deptChartInstance.destroy();
    }

    // 2. Create the Bar Chart
    deptChartInstance = new Chart(deptCtx.getContext('2d'), {
        type: 'bar', // Changed from doughnut to bar
        data: {
            labels: ['CSD', 'CSE', 'ECE', 'IT', 'MECH'],
            datasets: [{
                label: 'Student Participation',
                data: deptStats, 
                backgroundColor: [
                    'rgba(60, 189, 168, 0.8)', // CSD
                    'rgba(45, 52, 54, 0.8)',  // CSE
                    'rgba(99, 110, 114, 0.8)', // ECE
                    'rgba(178, 190, 195, 0.8)', // IT
                    'rgba(223, 230, 233, 0.8)'  // MECH
                ],
                borderColor: ['#3CBDA8', '#2d3436', '#636e72', '#b2bec3', '#dfe6e9'],
                borderWidth: 1,
                borderRadius: 8 // Makes the bars look modern/rounded
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0 } // Ensures whole numbers for student counts
                }
            },
            plugins: {
                legend: { display: false } // Hide legend as x-axis labels are enough
            }
        }
    });
}
// Call this function when the Admin Dashboard tab is loaded
// Example: renderAdminCharts([10, 0, 0, 0, 0], [1, 0]);