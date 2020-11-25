

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
            //game.players[0] = new Player(game, ws, '1');
            game.playerX = new Player(game, ws, 'X');
        } else {
            //let num = game.players.length;
            //game[num] = new Player(game, ws, num.toString());
            game.playerO = new Player(game, ws, 'O');
            game = null;
        }
    });
    console.log('The Blackjack server is running...');
})();

class Game {
    constructor() {
        this.deck = [];
        this.makeDeck();
        //this.players = [];
    }

    makeDeck() {
        //let card = 0;
        //for(let i = 0; i < 52; i++) {
        //   if (i % 4 === 0) {
        //       card += 1
        //   }
        //   this.deck[i] = card;
        //}
        //this.shuffle(this.deck);
        let card = 0;
         for(let i = 0; i < 52; i++) {
             this.deck[i] = card;
             card++;
         }
        Game.shuffle(this.deck);
    }

    static shuffle(a) {
        // code taken from https://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array
        let j, x, i;
        for (i = a.length - 1; i > 0; i--) {
            j = Math.floor(Math.random() * (i + 1));
            x = a[i];
            a[i] = a[j];
            a[j] = x;
        }
        //console.log(a);
        return a;
    }


    move(hit, player) {
        //console.log(hit);
        let card;

        if (player !== this.currentPlayer) {
            throw new Error('Not your turn');
        } else if (!player.opponent) {
            throw new Error('You don’t have an opponent yet');
        }

        else {
            if (hit === 1) {
                let num = this.deck.pop();
                //console.log("Num: ", num);
                //let suit = Math.floor(num / 13);
                player.cardsPlayed.push(num);
                num = Math.floor(num % 13) + 1;
                card = num.toString();
                if (card === "1") {
                    card = "Ace";
                } else if (card === "11") {
                    card = "Jack";
                } else if (card === "12") {
                    card = "Queen";
                } else if (card === "13") {
                    card = "King";
                }
                if (num > 10) {
                    num = 10;
                    //console.log("NewNum: ", num);
                }
                else if (num === 1) {
                    num = 11;
                }

                player.num += num;
                player.cardValues.push(num);
                player.showCards();
            }
            //console.log(player.cardsPlayed)
            //console.log(player.num);
            if (hit === 0) {
                this.currentPlayer = this.currentPlayer.opponent;
            }
        }

        return card;

    }
}

class Player {
    constructor(game, socket, mark) {
        Object.assign(this, { game, socket, mark});
        this.cardValues = [];
        this.num = 0;
        this.cardsPlayed = [];
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
                    let card = game.move(1, this);
                    //this.opponent.send(`OPPONENT_HIT`);
                    if (this.lost()) {
                        if (!this.hasAce()) {
                            this.send(`MESSAGE BUST You got a ${card}. Your number is now ${this.num}. Wait for your opponent to play.`);
                            if (this.opponent.num !== 0) {
                                this.whoWon();
                            }
                            else {
                                game.move(0, this);
                                this.opponent.send('MESSAGE Your move')
                            }
                        }
                        else {
                            this.num -= 10;
                            this.send(`MESSAGE You got a ${card}. Your Ace is now worth 1, and your number is now ${this.num}.`);
                        }
                    }
                    else {
                        this.send(`MESSAGE You got a ${card}. Your number is now ${this.num}`);
                    }
                } catch (e) {
                    console.trace(e);
                    this.send(`MESSAGE ${e.message}`);
                }
            } else if (command === "STAY") {
                try {
                    if(this === game.currentPlayer && this.opponent.num !== 0) {
                        this.whoWon();
                    }
                    else {
                        game.move(0, this);
                        this.send(`MESSAGE Your number is now ${this.num}. Wait for your opponent to play.`);
                        this.opponent.send(`MESSAGE Your move`);
                    }
                } catch (e) {
                    console.trace(e);
                    this.send(`MESSAGE ${e.message}`);
                }
            }
            else if (command === "PLAY AGAIN") {
                this.num = 0;
                this.opponent.num = 0;
                game.makeDeck();
                game.currentPlayer = this;
                this.send("PLAY AGAIN");
                this.opponent.send("PLAY AGAIN");
                this.send("MESSAGE Your move");
                this.opponent.send('MESSAGE Your opponent will move first');
                this.cardsPlayed = [];
                this.opponent.cardsPlayed = [];
                this.cardValues = [];
                this.opponent.cardValues = [];
            }
        });

        socket.on('close', () => {
            try { this.opponent.send('OTHER_PLAYER_LEFT'); } catch (e) {}
        });
    }

    hasAce() {
        for(let i = 0; i < this.cardsPlayed.length; i++) {
            if ((this.cardValues[i] === 11)) {
                this.cardValues[i] = 1;
                return true;
            }
        }
        return false;
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

    showCards() {
        console.log(this.cardValues);
        this.send("CARDS " + this.cardsPlayed);
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