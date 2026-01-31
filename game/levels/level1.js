const startBtn = document.getElementById("startBtn");
const landing = document.getElementById("landing");
const gameUI = document.getElementById("gameUI");
const board = document.getElementById("board");

const livesEl = document.getElementById("lives");
const scoreEl = document.getElementById("score");
const timerEl = document.getElementById("timer");
const counter = document.getElementById("counter");

let index=0,score=0,lives=3,time=120,timer;


const popup=document.createElement("div");
popup.className="popup";
popup.innerHTML=`
  <div class="popup-card">
    <h1 id="popTitle"></h1>
    <p id="popMsg"></p>
    <button id="restartBtn">Restart</button>
  </div>
`;
document.body.appendChild(popup);

const popTitle=document.getElementById("popTitle");
const popMsg=document.getElementById("popMsg");
const restartBtn=document.getElementById("restartBtn");

restartBtn.onclick=()=>location.reload();


startBtn.onclick=()=>{
landing.style.display="none";
gameUI.classList.remove("hidden");
startTimer();
load();
};

function startTimer(){
timer=setInterval(()=>{
time--;
timerEl.innerText=time;
if(time<=0) end("time");
},1000);
}

const overlay=document.createElement("div");
overlay.id="overlay";
overlay.innerText="STAGE CLEAR";
document.body.appendChild(overlay);

function clearBoard(){
board.innerHTML="";
}

function createTitle(title,text){
const h=document.createElement("h2");
h.innerText=title;

const p=document.createElement("div");
p.innerText=text;
p.style.opacity=".6";

board.append(h,p);
}

function tile(v){
const t=document.createElement("div");
t.className="tile";
t.innerText=v;
return t;
}

function success(el){
if(el) el.classList.add("correct");

confetti({particleCount:90,spread:70});

score+=20;
scoreEl.innerText=score;

overlay.classList.add("show");

setTimeout(()=>{
overlay.classList.remove("show");
index++;
load();
},900);
}

function lose(el){
lives--;
livesEl.innerText=lives;
if(el) el.classList.add("wrong");
if(lives<=0) end("life");
restartBtn();
}

function load(){

clearBoard();

counter.innerText=`Stage ${index+1} / 10`;

switch(index){

case 0:
createTitle("Complete the Pattern","Drag the missing number");
sequence([3,6,12,24,"?"],[36,40,48,52],48);
break;

case 1:
createTitle("Find the Intruder","Tap the odd number");
odd([15,21,24,35],24);
break;

case 2:
createTitle("Matrix Puzzle","Select the correct number");
matrix([2,4,6,3,6,9,4,8,"?"],[10,12,14,16],12);
break;

case 3:
createTitle("Decode the Word","Shift each letter by +1");
inputPuzzle("CAT → DBU\nDOG → ?", "EPH");
break;

case 4:
createTitle("Shape Pattern","Drag next shape");
sequence(["▲","■","▲","■","?"],["▲","■","●","◆"],"▲");
break;

case 5:
createTitle("Balance the Board","Select the correct number");
matrix([1,2,3,4,5,9,6,7,"?"],[12,13,14,15],13);
break;

case 6:
createTitle("Alphabet Code","Convert letters to numbers");
inputPuzzle("A=1  B=2  C=3\nACE = ?", "9");
break;

case 7:
createTitle("Memory Tiles","Watch the flash order and repeat it");
direction();
break;

case 8:
createTitle("Double Sequence","Drag next number");
sequence([2,4,8,16,"?"],[24,30,32,36],32);
break;

case 9:
createTitle("Final Challenge","Solve the grid");
matrix([3,6,18,4,8,32,5,10,"?"],[40,45,50,60],50);
break;

default:
end("win");
}
}

function sequence(seq,opts,ans){

const puzzle=document.createElement("div");
puzzle.className="puzzle-zone";

const options=document.createElement("div");
options.className="options-zone";

const row=document.createElement("div");
row.className="row";

seq.forEach(v=>{
const t=tile(v);

if(v==="?"){
t.classList.add("drop");
t.ondragover=e=>e.preventDefault();
t.ondrop=e=>{
const val=e.dataTransfer.getData("v");
if(val==ans) success(t);
else lose(t);
};
}

row.appendChild(t);
});

puzzle.appendChild(row);

opts.forEach(v=>{
const t=tile(v);
t.classList.add("draggable");
t.draggable=true;
t.ondragstart=e=>e.dataTransfer.setData("v",v);
options.appendChild(t);
});

board.append(puzzle,options);
}


function odd(nums,ans){
const puzzle=document.createElement("div");
puzzle.className="puzzle-zone";

nums.forEach(v=>{
const t=tile(v);
t.onclick=()=>{
if(v==ans) success(t);
else t.style.opacity=.3;
};
puzzle.appendChild(t);
});

board.append(puzzle);
}
function matrix(arr, opts, ans) {
    const puzzle = document.createElement("div");
    puzzle.className = "matrix";
    
    arr.forEach(v => {
        const t = tile(v);
        
        if (v === "?") {
            t.classList.add("drop");
            t.ondragover = e => {
                e.preventDefault();
            };
            t.ondrop = e => {
                e.preventDefault();
                const val = e.dataTransfer.getData("v");
                if (val == ans) {
                    success(t);
                } else {
                    lose(t);
                }
            };
        }
        puzzle.appendChild(t);
    });
    
    const options = document.createElement("div");
    options.className = "options-zone";
    
    opts.forEach(v => {
        const t = tile(v);
        t.classList.add("draggable");
        t.draggable = true;
        t.ondragstart = e => {
            e.dataTransfer.setData("v", v);
        };
        options.appendChild(t);
    });
    
    board.append(puzzle, options);
}
function inputPuzzle(questionText, ans){

const puzzle=document.createElement("div");
puzzle.className="puzzle-zone";
puzzle.style.flexDirection="column";
puzzle.style.gap="25px";
puzzle.style.textAlign="center";

const q=document.createElement("div");
q.style.fontSize="22px";
q.style.lineHeight="1.6";
q.innerText=questionText;

const inp=document.createElement("input");
inp.placeholder="TYPE ANSWER";
inp.style.width="280px";

inp.onkeydown=e=>{
if(e.key==="Enter"){
if(inp.value.toUpperCase()==ans){
success(inp);
}else{
lose(inp);
}
}
};

puzzle.append(q,inp);
board.append(puzzle);
}

function direction(){

const puzzle=document.createElement("div");
puzzle.className="puzzle-zone";

const tiles=[];
let sequence=[];
let player=[];
const size=4;

const grid=document.createElement("div");
grid.style.display="grid";
grid.style.gridTemplateColumns="repeat(2,100px)";
grid.style.gap="18px";

for(let i=0;i<size;i++){
const t=tile(i+1);
t.style.background="#222";
grid.appendChild(t);
tiles.push(t);

t.onclick=()=>{
player.push(i);
t.classList.add("correct");

setTimeout(()=>t.classList.remove("correct"),500);

check();
};
}

puzzle.appendChild(grid);
board.appendChild(puzzle);

for(let i=0;i<3;i++){
sequence.push(Math.floor(Math.random()*size));
}

let delay=0;

sequence.forEach(idx=>{
setTimeout(()=>{
tiles[idx].classList.add("correct");
setTimeout(()=>tiles[idx].classList.remove("correct"),500);
},delay+=600);
});

function check(){

for(let i=0;i<player.length;i++){
if(player[i]!==sequence[i]){
lose(tiles[player[i]]);
player=[];
return;
}
}

if(player.length===sequence.length){
success(tiles[sequence[0]]);
}
}
}

function end(type){

clearInterval(timer);

popup.className="popup show";

if(type==="win"){
popup.classList.add("win");
popTitle.innerText="🚀 LEVEL COMPLETE";
popMsg.innerText=`Score : ${score}`;
confetti({particleCount:150,spread:100});
}

if(type==="life"){
popup.classList.add("fail");
popTitle.innerText="💀 MISSION FAILED";
popMsg.innerText="Out of lives";
}

if(type==="time"){
popup.classList.add("time");
popTitle.innerText="⏰ TIME UP";
popMsg.innerText="Better luck next time";
}
}
