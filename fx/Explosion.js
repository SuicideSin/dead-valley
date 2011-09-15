define(['Game', 'Sprite', 'fx/BulletHit'], function (Game, Sprite, BulletHit) {

  var MAX_LIFE = 0.2; // in seconds

  var sparks = new BulletHit({
    color:     '#400',
    minLength: 50,
    range:     150,
    lifetime:  0.3,
    size:      5
  });

  var Explosion = function () {
    this.init('Explosion');

    this.frame = Math.floor(Math.random() * 4);
    this.life  = 0;
    this.scale = 0.1;

    this.pos.rot = 360 * Math.random();
  };
  Explosion.prototype = new Sprite();

  Explosion.prototype.draw = function (delta) {
    this.drawTile(this.frame);
  };

  Explosion.prototype.preMove = function (delta) {
    this.scale   += 20 * delta;
    this.opacity -= delta;
  };

  Explosion.prototype.postMove = function (delta) {
    this.life += delta;
    if (this.life > MAX_LIFE) {
      this.die();
    }
  };

  // don't need these methods
  Explosion.prototype.transformNormals = function () {};
  Explosion.prototype.updateGrid       = function () {};

  Explosion.prototype.z = 150;

  Explosion.createNew = function (position) {
    var sparkCount = 5;
    for (var i = 0; i < sparkCount; i++) {
      sparks.fireSparks({
        point:     position,
        normal:    new Vector(360 * Math.random()),
        direction: new Vector(360 * Math.random())
      });
    }
    var explosion = new Explosion();
    explosion.pos.set(position);
    Game.sprites.push(explosion);
  };

  return Explosion;
});