const section = document.querySelector('section');
const messageArea = document.querySelector('#info');
const square = location => document.querySelector(`#s${location}`);
const joinButton = document.querySelector('#join');
const leaveButton = document.querySelector('#leave');
const serverTextField = document.querySelector('#serverIp');
const hitButton = document.querySelector('#hit');
const stayButton = document.querySelector('#stay');
const playAgainButton = document.querySelector('#playAgain');
const image1 = document.querySelector('#image1');
const image2 = document.querySelector('#image2');
const image3 = document.querySelector('#image3');
const image4 = document.querySelector('#image4');
const image5 = document.querySelector('#image5');
const image6 = document.querySelector('#image6');

image1.style.display = 'none';
image2.style.display = 'none';
image3.style.display = 'none';
image4.style.display = 'none';
image5.style.display = 'none';
image6.style.display = 'none';
hitButton.style.display = 'none';
stayButton.style.display = 'none';
playAgainButton.style.display = 'none';


joinButton.addEventListener('click', joinGame);
leaveButton.addEventListener('click', () => leaveGame('Bye!'));
hitButton.addEventListener('click', hit);
stayButton.addEventListener('click', stay);
playAgainButton.addEventListener('click', playAgain);

function playAgain() {
    socket.send("PLAY AGAIN");
}

function hit() {
    socket.send("HIT");
}

function stay() {
    socket.send("STAY");
}
let socket, mark, opponentMark, gameOver = false;


function joinGame() {
    const host = serverTextField.value || 'localhost';
    gameOver = false;
    socket = new WebSocket(`ws://${host}:58901`);
    socket.addEventListener('message', (event) => { processCommand(event.data); });
    document.querySelectorAll('section div').forEach(s => s.textContent = '');
    joinButton.style.display = 'none';
    serverTextField.style.display = 'none';
    hitButton.style.display = 'inline';
    stayButton.style.display = 'inline';
    leaveButton.style.display = 'inline';
    socket.onerror = () => leaveGame("Error: The server is probably down");
}

function leaveGame(message) {
    messageArea.textContent = message || 'Game over';
    socket.send('QUIT');
    gameOver = true;
    joinButton.style.display = 'inline';
    serverTextField.style.display = 'inline';
    leaveButton.style.display = 'none';
}

function showCards(stringOfCards) {
    images = [image1, image2, image3, image4, image5, image6];
    for(i = 0; i < stringOfCards.length; i++) {
        images[i].src = "Cards/JPEG/" + stringOfCards[i].trim() + ".jpg";
        images[i].style.display = 'inline';
    }
    //image1.
    //image1.style.display = 'inline';
    //image.textContent = stringOfCards[0];

    //image.textContent = stringOfCards;
}

function processCommand(command) {
    if(!gameOver){
        if (command.startsWith('WELCOME')) {
            mark = command[8];
            opponentMark = mark === 'X' ? 'O' : 'X';
        } else if (command.startsWith('VALID_MOVE')) {
            square(command.substring(11)).textContent = mark;
            messageArea.textContent = 'Valid move, please wait';
        } else if (command.startsWith('OPPONENT_MOVED')) {
            square(command.substring(15)).textContent = opponentMark;
            messageArea.textContent = 'Opponent moved, your turn';
        } else if (command.startsWith('MESSAGE')) {
            messageArea.textContent = command.substring(8);
        } else if (command.startsWith('VICTORY')) {
            leaveGame('WINNER WINNER');
        } else if (command.startsWith('DEFEAT')) {
            leaveGame('Oh sorry you lost');
        } else if (command.startsWith('TIE')) {
            leaveGame('Tie game so boring');
        } else if (command.startsWith('OTHER_PLAYER_LEFT')) {
            leaveGame(!gameOver ? 'Woah your opponent bailed' : '');
        }
        else if(command.startsWith('YOU ')) {
            messageArea.textContent = command;
            gameOver = true;
            hitButton.style.display = 'none';
            stayButton.style.display = 'none';
            playAgainButton.style.display = 'inline';
        }
        else if(command.startsWith('CARDS')) {
            showCards(command.substring(5).split(","));
        }
        else {
            messageArea.textContent = command;
        }
    }

    else if(gameOver){
        if(command.startsWith('PLAY AGAIN')){
            hitButton.style.display = 'inline';
            stayButton.style.display = 'inline';
            playAgainButton.style.display = 'none';
            gameOver = false;
        }
    }

}
