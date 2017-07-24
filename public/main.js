var width = window.innerWidth;
var height = window.innerHeight;

var game = new Phaser.Game(width, height, Phaser.AUTO, 'phaser-example', { preload: preload, create: create, update: update, render: render });
var player;
var socket, players = {};
var map;
var map_size = 2000;
var style = { font: "80px Arial", fill: "white" };
var text;
var bullets;

var fireRate = 100;
var nextFire = 0;
var balls;
var ball;
var player_speed = 400;
var live;
var moveBullets;

function preload() {
    game.load.image('unit', 'img/unit.png');
    game.load.image('bullet', 'img/bullet.png');
    game.load.image('map', 'img/grid.png');
}

function create() {
    socket = io.connect(window.location.host);

    game.physics.startSystem(Phaser.Physics.ARCADE);

    game.time.advancedTiming = true;
    game.time.desiredFps = 60;
    game.time.slowMotion = 0;

    bg = game.add.tileSprite(0, 0, map_size, map_size, 'map'); //maps sprite
    game.world.setBounds(0, 0, map_size, map_size); //map size
    game.stage.backgroundColor = "#242424";

    // make the players
    socket.on("add_players", function(data) {
        data = JSON.parse(data);
        for (let playerId in data) {
            if (players[playerId] == null && data[playerId].live) {
                addPlayer(playerId, data[playerId].x, data[playerId].y, data[playerId].name);
            }
        }
        live = true;
    });

    // make a player
    socket.on("add_player", function(data) {
        data = JSON.parse(data);
        if (data.player.live) {
            addPlayer(data.id, data.player.x, data.player.y, data.player.name);
        }
    });

    // player rotation
    socket.on("player_rotation_update", function(data) {
        data = JSON.parse(data);
        players[data.id].player.rotation = data.value;
    });

    // update players position
    socket.on("player_position_update", function(data) {
        data = JSON.parse(data);
        players[socket.id].player.body.velocity.x = 0;
        players[socket.id].player.body.velocity.y = 0;

        players[data.id].player.x += data.x;
        players[data.id].player.y += data.y;

    });

    // fire
    socket.on('player_fire_add', function(id) {
        players[id].weapon.fire();
    });

    game.input.onDown.add(function() {
        socket.emit("shots_fired", socket.id);
    });

    // players dead
    socket.on('clean_dead_player', function(victimId) {
        if (victimId == socket.id) {
            live = false;
        }

        socket.on("gameOver", function(data) {
            text = game.add.text(width / 2, height / 2, data, { font: "32px Arial", fill: "#ffffff", align: "center" });
            text.fixedToCamera = true;
            text.anchor.setTo(.5, .5);
        });
        players[victimId].player.kill();

    });

    // players disconnect
    socket.on('player_disconnect', function(id) {
        players[id].player.kill();
    }); //убираем отключившихся игроков

    // keyboard init
    keybord = game.input.keyboard.createCursorKeys();
}
// 

function update() {
    if (live == true) {
        players[socket.id].player.rotation = game.physics.arcade.angleToPointer(players[socket.id].player);
        socket.emit("player_rotation", players[socket.id].player.rotation);
        // collisions function
        setCollisions();
        // charaster control
        characterController();
    }
}

// bullet handler
function bulletHitHandler(player, bullet) {
    socket.emit("player_killed", player.id);

    bullet.destroy();
}

function setCollisions() {
    for (let x in players) {
        for (let y in players) {
            if (x != y) {
                game.physics.arcade.collide(players[x].weapon.bullets, players[y].player, bulletHitHandler, null, this);
            }
        }
    }
}

function sendPosition(character) {
    socket.emit("player_move", JSON.stringify({
        "id": socket.id,
        "character": character
    }));
}

// control
function characterController() {

    if (game.input.keyboard.isDown(Phaser.Keyboard.A) || keybord.left.isDown) {
        sendPosition("A");
    }
    if (game.input.keyboard.isDown(Phaser.Keyboard.D) || keybord.right.isDown) {
        sendPosition("D");
    }
    if (game.input.keyboard.isDown(Phaser.Keyboard.W) || keybord.up.isDown) {
        sendPosition("W");
    }
    if (game.input.keyboard.isDown(Phaser.Keyboard.S) || keybord.down.isDown) {
        sendPosition("S");
    }
}

function render() {
    game.debug.cameraInfo(game.camera, 32, 32);
}

// add player and weapon
function addPlayer(playerId, x, y) {
    player = game.add.sprite(x, y, "unit");
    game.physics.arcade.enable(player);
    player.smoothed = false;
    player.anchor.setTo(0.5, 0.5);
    player.scale.set(.8);
    player.body.collideWorldBounds = true;
    player.id = playerId;

    let weapon = game.add.weapon(30, 'bullet');
    weapon.bulletKillType = Phaser.Weapon.KILL_WORLD_BOUNDS;
    weapon.bulletSpeed = 600;
    weapon.fireRate = 100;
    weapon.trackSprite(player, 0, 0, true);

    players[playerId] = { player, weapon };
    game.camera.follow(players[socket.id].player, );
}