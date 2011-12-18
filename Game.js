//
// Couple notes on our setup
//
// 1 pixel  == 4 inches
// 3 pixels == 1 foot
// 1 tile   == 60 pixels == 20 feet
// 1 mile   == 63360 inches == 15840 pixels
// 60  miles / hour == 264 pixels / second
// 100 miles / hour == 440 pixels / second

define(['AssetManager',
        'GameTime',
        'Keyboard',
        'Collidable',
        'EventMachine',
        'SpriteMarshal',
        'Vector',
        'World'],
        function (AssetManager,
                  GameTime,
                  Keyboard,
                  Collidable,
                  EventMachine,
                  SpriteMarshal,
                  Vector,
                  World) {

  var i, sprite, spriteCount, object, objectCount;

  var spriteID = 0;

  var waitingSprites = 0;

  var gameStates = {
    start: function (delta) {
      Game.events.fireEvent('game start');
      Game.isOver = false;
      GameTime.setTime(0);
      GameTime.setTargetTime(Game.targetTime);
      currentGameState = gameStates.running;
    },
    running: function (delta) {
      GameTime.tick(delta);
      var distance = Math.round(Game.dude.pos.magnitude() / 15840);
      if (distance > Game.targetMiles) {
        currentGameState = gameStates.won;
      } else if (Game.dude.health <= 0) {
        currentGameState = gameStates.died;
      }
    },
    won: function (delta) {
      Game.isOver = true;
      Game.events.fireEvent('game over');
    },
    died: function (delta) {
      World.clear();
      Game.isOver = true;
      Game.events.fireEvent('game over');
    }
  };

  var currentGameState = gameStates.start;

  GameTime.subscribe("target time passed", function () {
    currentGameState = gameStates.died;
  });

  var Game = {
    assetManager:  new AssetManager('./assets/'),
    keyboard:      Keyboard,
    targetMiles:   20,
    targetTime:    GameTime.secondsInADay * 3 + 0.7,
    gridSize:      60,
    tileRowSize:   9,  // should be set by asset manager
                       // this is the number of tiles in row
                       // of the tile image
    GameWidth:     $('#canvas-mask').width(),
    GameHeight:    $('#canvas-mask').height(),
    map:           null,
    dude:          null,
    sprites:       [],
    objects:       [],
    events:        EventMachine(),
    skyContext:    $('#sky-canvas')[0].getContext('2d'),
    threeDee:      true, // 3D acceleration

    startPosition: new Vector(1714, 1822),

    runMap: function (delta) {
      if (this.map) this.map.run(delta);
    },

    renderMap: function (delta) {
      if (this.map) this.map.render(delta);
    },

    runSprites: function (delta) {
      if (this.map) {

        spriteCount = this.sprites.length;

        // pre move
        for (i = 0; i < spriteCount; i++) {
          sprite = this.sprites[i];

          if (sprite.visible && sprite.preMove) {
            sprite.preMove(delta);
          }
        }

        // speculative move
        for (i = 0; i < spriteCount; i++) {
          sprite = this.sprites[i];
          if (sprite.visible && sprite.collidable) {
            // use the current delta
            sprite.speculativeMove(delta);
          }
        }

        Collidable.clearCurrentCollisionList();

        // generate contact list
        var contactList = [];
        for (i = 0; i < spriteCount; i++) {
          sprite = this.sprites[i];
          if (sprite.visible && sprite.collidable) {
            sprite.checkForCollisionsWithNearbyObjects(contactList);
          }
        }

        // contacts resolution
        var contact;
        var contactListLength = contactList.length;
        for (var j = 0; j < 3; j++) {
	  for (i = 0; i < contactListLength; i++) {
	    contact = contactList[i];
	    if ( !(contact.we.isRigidBody || contact.they.isRigidBody) ) {
	      Collidable.speculativeContactRectifier(contact, delta);
	    }
	  }
        }
      
        // integrate
        for (i = 0; i < spriteCount; i++) {
          sprite = this.sprites[i];

          if (sprite.visible) {
            if (sprite.collidable) {
              sprite.restorePreSpeculativePosition();
            }

            if (sprite.integrate && !sprite.stationary) {
              sprite.integrate(delta);
            } else if (sprite.updateGrid) {
	      sprite.updateGrid();
	    }
          }
        }

        Collidable.clearCurrentCollisionList();

        // rigid body collisions
        for (i = 0; i < contactListLength; i++) {
          contact = contactList[i];
          if (contact.we.isRigidBody || contact.they.isRigidBody) {
            Collidable.rigidBodyContactRectifier(contact);

            // retry and rectify this collision so we're not bouncy
            contact.we.speculativeMove(delta);
            contact.they.speculativeMove(delta);

            var newContact = contact.we.checkCollision(contact.they);
            if (newContact) {
              Collidable.speculativeContactRectifier(newContact, delta);
            }

            contact.we.restorePreSpeculativePosition();
            contact.they.restorePreSpeculativePosition();
          }

	  // report all collisions
	  Collidable.reportCollision(contact);
        }

        // post move
        for (i = 0; i < spriteCount; i++) {
          sprite = this.sprites[i];
          if (sprite.visible && sprite.postMove) {
            sprite.postMove(delta);
          }

          if (sprite.reap) {
            sprite.reap = false;
            this.sprites.splice(i, 1);
            i--;
            spriteCount--;
          }
        }

      }
    },

    runObjects: function (delta) {
      objectCount = this.objects.length;
      for (i = 0; i < objectCount; i++) {
        this.objects[i].tick(delta);
      }
    },

    renderSprites: function (delta) {
      if (this.map) {
        spriteCount = this.sprites.length;
        for (i = 0; i < spriteCount; i++) {
          sprite = this.sprites[i];
          if (sprite.render && sprite.visible) {
            sprite.render(delta);
          }
        }
      }
    },

    addSpritesFromStrings: function (sprites, offset) {
      var self = this;

      _(sprites).each(function (spriteString) {

	waitingSprites++;

        SpriteMarshal.marshal(spriteString, function (sprite) {
          sprite.pos.translate(offset);
          self.addSprite(sprite);
	  waitingSprites--;
	  if (waitingSprites === 0) {
	    self.events.fireEvent('waiting sprites loaded');
	  }
        });
      });
    },

    addSprite: function (sprite) {
      this.addSpriteID(sprite);
      this.sprites.push(sprite);
      if (sprite.spawned) {
	sprite.spawned();
      }
    },

    addSpriteID: function (sprite) {
      sprite.id = spriteID++;
    },

    // number of sprites we're waiting to load
    waitingSpriteCount: function () {
      return waitingSprites;
    },

    newDude: function (dude) {
      if (this.dude) {
	this.dude.die();
      }
      this.dude = dude;

      this.addSprite(dude);

      this.events.fireEvent('new dude', dude);
    },

    registerObjectForDeltaUpdates: function (object) {
      this.objects.push(object);
    },
    
    runGameState: function (delta) {
      currentGameState.call(this, delta);
    }
  };

  return Game;
});
