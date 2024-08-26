const gameboard = document.querySelector('#gameboard')
const ctx = gameboard.getContext("2d")
const scoretext = document.querySelector('#scoretxt')
const reset = document.querySelector('#resetbtn')
const gamewidth = gameboard.width
const gameheight = gameboard.height
const boardbackground = "forestgreen"
const paddle1_color = "lightblue"
const paddle2_color = "red"
const paddle_border = "black"
const ballcolor = "yellow"
const ball_bordercolor = "black"
const ballradius = 12.5
const paddlespeed = 50

let intervalID
let ballspeed = 1
let ballx = gamewidth / 2
let bally = gameheight / 2
let ballxDirection = 0
let ballyDirection = 0
let player1score = 0
let player2score = 0
let paddle1 = {
    width: 25,
    height: 100,
    x: 0,
    y: 0
}

let paddle2 = {
    width: 25,
    height: 100,
    x: gamewidth - 25,
    y: gameheight - 100
}

window.addEventListener("keydown", changeDirection)
reset.addEventListener("click", resetGame)

gamestart()

function gamestart() {
    createBall()
    nextTick()
}

function nextTick() {
    intervalID = setTimeout(() => {
        clearBoard()
        drawPaddles()
        moveBall()
        // changeDirection()
        drawball(ballx,bally)
        checkcollision()
        nextTick()

    }, 10);
}

function clearBoard() {
    ctx.fillStyle = boardbackground
    ctx.fillRect(0, 0, gamewidth, gameheight)
}

function drawPaddles() {
    ctx.strokeStyle = paddle_border

    ctx.fillStyle = paddle1_color
    ctx.fillRect(paddle1.x, paddle1.y, paddle1.width, paddle1.height)
    ctx.strokeRect(paddle1.x, paddle1.y, paddle1.width, paddle1.height)

    
    ctx.fillStyle = paddle2_color
    ctx.fillRect(paddle2.x, paddle2.y, paddle2.width, paddle2.height)
    ctx.strokeRect(paddle2.x, paddle2.y, paddle2.width, paddle2.height)
}

function createBall() {
    ballspeed = 1
    if (Math.round(Math.random()) == 1) {
        ballxDirection = 1

    }
    else {
        ballxDirection = -1
    }

    if (Math.round(Math.random()) == 1){
        ballyDirection = 1
    }
    else {
        ballyDirection = -1
    }

    ballx = gamewidth / 2
    bally = gameheight / 2

    drawball(ballx, bally)
}

function moveBall() {
    ballx += (ballspeed * ballxDirection)
    bally += (ballspeed * ballyDirection)
}

function drawball(ballx, bally) {
    ctx.fillStyle = ballcolor
    ctx.strokeStyle = ball_bordercolor
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(ballx, bally, ballradius, 0, 2 * Math.PI)
    ctx.stroke()
    ctx.fill()
}

function checkcollision() {
    if(bally <= 0 + ballradius) {
        ballyDirection *= -1
    }
    if(bally >= gameheight - ballradius) {
        ballyDirection *=  -1
    }

    if(ballx <= 0) {
        player2score+=1
        updateScore()
        createBall()
        return;
    }
    if(ballx >= gamewidth) {
        player1score+=1 
        updateScore()
        createBall()
        return
    }

    if(ballx <= (paddle1.x + paddle1.width + ballradius)){
        if (bally > paddle1.y && bally < paddle1.y + paddle1.height){
            ballx = (paddle1.x + paddle1.width) + ballradius
            ballxDirection *= -1
            ballspeed += 0.5
        }
    }
    if(ballx  >= (paddle2.x - ballradius)){
        if (bally > paddle2.y && bally < paddle2.y + paddle2.height){
            ballx = paddle2.x - ballradius
            ballxDirection *= -1
            ballspeed += 0.5
        }
    }

    
}

function changeDirection(event) {
    const keypressed = event.keyCode
    console.log(keypressed)
    const paddle1up = 87
    const paddle1down = 83
    const paddle2up = 38
    const paddle2down = 40

     switch(keypressed) {
         case(paddle1up):
             if(paddle1.y > 0) {
             paddle1.y -= paddlespeed
             }
             break
         case(paddle1down):
             if(paddle1.y < gameheight - paddle1.height){
             paddle1.y += paddlespeed
             }
             break;
        
         case(paddle2up):
             if(paddle2.y > 0) {
             paddle2.y -= paddlespeed
             }
             break
         case(paddle2down):
             if(paddle2.y < gameheight - paddle2.height){
             paddle2.y += paddlespeed
             }
             break;

    }
}

function updateScore() {
    scoretext.textContent = `${player1score} : ${player2score}`
}

function resetGame() {
    player1score = 0
    player2score = 0

    paddle1 = {
        width: 25,
        height: 100,
        x: 0,
        y: 0
    }
    
    paddle2 = {
        width: 25,
        height: 100,
        x: gamewidth - 25,
        y: gameheight - 100
    }
    ballspeed = 1
    ballx = 0
    bally = 0
    ballxDirection = 0
    ballyDirection = 0
    updateScore()
    clearInterval(intervalID)
    gamestart()
}