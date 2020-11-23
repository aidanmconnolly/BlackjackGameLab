// A server for a multi-player tic tac toe game. Loosely based on an example in
// Deitel and Deitel’s “Java How to Program” book. For this project I created a
// new application-level protocol called TTTP (for Tic Tac Toe Protocol), which
// is entirely plain text. The messages of TTTP are:
//
// Client -> Server
//     MOVE <n>
//     QUIT
//
// Server -> Client
//     WELCOME <char>
//     VALID_MOVE
//     OTHER_PLAYER_MOVED <n>
//     OTHER_PLAYER_LEFT
//     VICTORY
//     DEFEAT
//     TIE
//     MESSAGE <text>

const WebSocket = require('ws');

const server = new WebSocket.Server({ port: 58901 });

(() => {
    // When null, we are waiting for the first player to connect, after which we will
    // create a new game. After the second player connects, the game can be fully set
    // up and played, and this variable immediately set back to null so the future
    // connections make new games.
    let game = null;

    server.on('connection', (ws, req) => {
        console.log('Connection from', req.connection.remoteAddress);
        if (game === null) {
            game = new Game();
            game.playerX = new Player(game, ws, 'X');
        } else {
            game.playerO = new Player(game, ws, 'O');
            game = null;
        }
    });
    console.log('The Blackjack server is running...');
})();

class Game {
    // A board has nine squares. Each square is either unowned or it is owned by a
    // player. So we use a simple array of player references. If null, the corresponding
    // square is unowned, otherwise the array cell stores a reference to the player that
    // owns it.
    constructor() {
        this.deck = [];
        let card = 0;
        for(let i = 0; i < 52; i++) {
            if (i % 4 === 0) {
                card += 1
            }
            this.deck[i] = card;
        }
        this.shuffle(this.deck);
    }

    shuffle(a) {
        // code taken from https://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array
        var j, x, i;
        for (i = a.length - 1; i > 0; i--) {
            j = Math.floor(Math.random() * (i + 1));
            x = a[i];
            a[i] = a[j];
            a[j] = x;
        }
        console.log(a);
        return a;
    }


    move(hit, player) {
        console.log(hit);
        if (player !== this.currentPlayer) {
            throw new Error('Not your turn');
        } else if (!player.opponent) {
            throw new Error('You don’t have an opponent yet');
        }

        if (hit === 1) {
            let num = this.deck.pop();
            if(num > 10) {
                num = 10;
            }
            player.num += num;
        }

        console.log(player.num);
        if(hit === 0) {
            this.currentPlayer = this.currentPlayer.opponent;
        }

    }
}

class Player {
    constructor(game, socket, mark) {
        Object.assign(this, { game, socket, mark});
        this.num = 0;
        this.send(`WELCOME ${mark}`);
        if (mark === 'X') {
            game.currentPlayer = this;
            this.send('MESSAGE Waiting for opponent to connect');
        } else {
            this.opponent = game.playerX;
            this.opponent.opponent = this;
            this.send('MESSAGE Your opponent will move first');
            this.opponent.send('MESSAGE Your move');
        }

        socket.on('message', (buffer) => {
            const command = buffer.toString('utf-8').trim();
            console.log(`Received ${command}`);
            if (command === 'QUIT') {
                socket.close();
            } else if (command === "HIT") {
                try {
                    game.move(1, this);
                    //this.opponent.send(`OPPONENT_HIT`);
                    if (this.lost()) {
                        this.send(`MESSAGE BUST Your number is now ${this.num}. Wait for your opponent to play.`);
                        if(this.opponent.num !== 0) {
                            this.whoWon();
                        }
                        else {
                            game.move(0, this);
                            this.opponent.send('MESSAGE YOUR TURN')
                        }
                    }
                    else {
                        this.send(`MESSAGE Your number is now ${this.num}`);
                    }
                } catch (e) {
                    console.trace(e);
                    this.send(`MESSAGE ${e.message}`);
                }
            } else if (command === "STAY") {
                try {
                    if(this.opponent.num !== 0) {
                        this.whoWon();
                    }
                    else {
                        game.move(0, this);
                        this.send(`MESSAGE Your number is now ${this.num}. Wait for your opponent to play.`);
                        this.opponent.send(`MESSAGE YOUR TURN`);
                    }
                } catch (e) {
                    console.trace(e);
                    this.send(`MESSAGE ${e.message}`);
                }

            }
        });

        socket.on('close', () => {
            try { this.opponent.send('OTHER_PLAYER_LEFT'); } catch (e) {}
        });
    }

    whoWon(){
        if (this.num > 21 && this.opponent.num > 21) {
            this.send('YOU TIED, both players went over 21.');
            this.opponent.send('YOU TIED, both players went over 21');
        }
        else if (this.num > 21) {
            this.send(`YOU LOST! You went over 21 and your opponent got ${this.opponent.num}`);
            this.opponent.send(`YOU WON! Your opponent went over 21 and you got ${this.opponent.num}`);
        }
        else if (this.opponent.num > 21) {
            this.send(`YOU WON! Your opponent went over 21 and you got ${this.num}`);
            this.opponent.send(`YOU LOST! You went over 21 and your opponent got ${this.num}`);
        }
        else if(this.num > this.opponent.num) {
            this.send(`YOU WON! You got ${this.num} and your opponent got ${this.opponent.num}`);
            this.opponent.send(`YOU LOST! You got ${this.opponent.num} and your opponent got ${this.num}`);
        }
        else if(this.num < this.opponent.num) {
            this.send(`YOU LOST! You got ${this.num} and your opponent got ${this.opponent.num}`);
            this.opponent.send(`YOU WON! You got ${this.opponent.num} and your opponent got ${this.num}`);
        }

        else if(this.num === this.opponent.num){
            this.send('YOU TIED, both players have the same number.');
            this.opponent.send('YOU TIED, both players have the same number.');
        }
    }

    lost() {
        return this.num > 21;
    }

    send(message) {
        try {
            this.socket.send(`${message}\n`);
        } catch (e) {
            console.error(e);
        }
    }
}