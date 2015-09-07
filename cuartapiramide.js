/********************
INICIALIZA EL MOTOR
*********************/

window.addEventListener("load",function() {

// ## Set up an instance of the Quintus engine and include
// the Sprites, Scenes, Input and 2D module. The 2D module
// includes the `TileLayer` class as well as the `2d` componet.
var Q = Quintus({ development: true/*, audioSupported: [ 'mp3','ogg' ]*/ })
      .include("Sprites, Scenes, Input, 2D, Anim, Touch, UI, TMX, Audio")
      // Set the size of the html file (canvas)
      // And turn on default input controls and touch input (for UI)
      .setup("cuartapiramide").controls().touch()
      // Enable sounds.
      .enableSound();


  // ## Define the constants for the collision masks
  //The original values are also defined in the "quintus_sprites.js"
  Q.SPRITE_NONE = 0;
  Q.SPRITE_PLAYER = 1;
  Q.SPRITE_ENEMY = 2;
  Q.SPRITE_COLLECTABLE = 4;
  Q.SPRITE_FRIEND = 8;
  Q.SPRITE_NOCOLLISION = 16;

  // ## Define the constants for the map size
  backgroundH = 40*30;
  backgroundW = 500*30; //CHANGE THIS CONSTANT FOR A VARABLE REFERED TO THE STAGE WIDTH if possible

/*********************************************************************/
// ## Define la clase del Jugador
/*********************************************************************/
Q.Sprite.extend("Jugador",{

  init: function(p) {
    this._super(p, {
      // Default values   
      sprite: "wario",
      sheet: "wario", // Setting a sprite sheet sets sprite width and height
      frame: 0,
      jumpSpeed: -450,
      points: [ [-14, -24], [-18, 15], [-12, 28], [12, 28], [18, 15], [14, -24]], //modify the collision bounding box 
      speed: 200,
      dead: false,
      won: false,
      direction: "right",
      aguaCounter: 0,
      comidaCounter: 0,
      rodado: false,

      type: Q.SPRITE_PLAYER,
      collisionMask: Q.SPRITE_DEFAULT | Q.SPRITE_NOCOLLISION | Q.SPRITE_COLLECTABLE | Q.SPRITE_FRIEND
    });

    this.add('2d, platformerControls, animation, tween');

    this.on("enemy.hit","die");
    this.on("win","win");
  },

  step: function(dt) {

    //disminuye las comida y bebida
    this.p.aguaCounter = this.p.aguaCounter + dt;
    if(this.p.aguaCounter >= 1) { //cada segundo
      Q.state.dec("agua", 1);     
      this.p.aguaCounter = 1 - this.p.aguaCounter;
    }

    this.p.comidaCounter = this.p.comidaCounter + dt;
    if(this.p.comidaCounter >= 3) { //cada 3 segundos
      Q.state.dec("comida", 1);     
      this.p.comidaCounter = 3 - this.p.comidaCounter;
    }

    if(Q.state.get("agua") == 0 || Q.state.get("comida") == 0) {
      this.die();
    }

    //run when the key Z is pressed
    if(Q.inputs['run']) {
      this.p.speed = 300;
    } else {
      this.p.speed = 200;
    }

    //follow the character unless he is in the corners of the map
    if (this.p.x > (Q.width/2 - this.p.w/2)  && this.p.x < (backgroundW - (Q.width/2 + this.p.w/2))) {
      this.stage.follow( this, {x: true});
    } else {
      this.stage.follow( this, {x: false});
    }

    if (this.p.y > (Q.height/2 - this.p.h/2)  && this.p.y < (backgroundH - (Q.height/2 + this.p.h/2))) {
      this.stage.follow( this, {y: true});
    } else {
      this.stage.follow( this, {y: false});
    }

    //dont allow to pass the character more than the map size
    if (this.p.x < 0 + this.p.w/2) {
      this.p.x = this.p.w/2;
    } else if (this.p.x > backgroundW - this.p.w/2){
      this.p.x = backgroundW - this.p.w/2;
    }

    //when fall down, dies
    if( this.p.y >= backgroundH + this.p.h) {
      this.die();
    }

    //Control the animations
    if(this.p.vx > 0) {
      this.p.direction = "right";
    } else if(this.p.vx < 0) {
      this.p.direction = "left";
    }

    //If not dead, play animations and control the movement
    if(!this.p.dead && !this.p.won) {
      if(this.p.vy == 0 && this.p.vx == 0 && !this.p.ignoreControls) {
        this.play("stand_" + this.p.direction);
      } else if(this.p.landed > 0 && !this.p.ignoreControls) {
        
        if(Q.inputs['run']) {
          if(Q.inputs['action']) {
            if(!this.p.rodado) {
              this.p.rodado = true;
              Q.audio.play('roll.ogg', { loop: false });
            }

              this.play("roll_" + this.p.direction);
            
          } else 
          this.play("run_" + this.p.direction);
          this.p.rodado = false;
        } else {
          this.play("walk_" + this.p.direction);
          this.p.rodado = false;
        }
        
      } else if(this.p.ignoreControls) { //duck 
        this.play("duck_" + this.p.direction);

      } else {
        this.play("jump_" + this.p.direction);
      }

      //When duck, slide if is in the floor
      if(Q.inputs['down']) {
        this.p.ignoreControls = true;
            
            if(this.p.landed > 0) {
              this.p.vx = this.p.vx * (1 - dt*10);
            }
          } else {
            this.p.ignoreControls = false;
      }


    } else if (this.p.dead) {
      this.play("dead_" + this.p.direction);
    }

  },

  die: function() {
    if(!this.p.dead) {
      this.p.dead = true;
      this.del('2d, platformerControls');   

      //Play the die music
      Q.audio.stop();      
      Q.audio.play('dead_player.ogg', { loop: false });

      //Animate falling down and destroy
      this.animate({ x: this.p.x, y: this.p.y-50, angle: 0 }, 0.25, Q.Easing.Linear);
      this.animate({ x: this.p.x, y: backgroundH+this.p.h, angle: 0 }, 2.5, Q.Easing.Quadratic.In, {delay: 0.5, callback: function() { 
        this.destroy(); 
        this.stage.pause(); //"pause" can be removed to continue seeing the game when the player dies

        if(Q.state.get("vidas") > 0) {
         
          Q.state.dec("vidas", 1);
          //restart the level
          Q.clearStages();
          Q.stageScene('level1');
          Q.stageScene("HUD", 3);
        } else {
          //end the game
          Q.audio.stop('cairo_chase.ogg');
          this.stage.pause();
          Q.stageScene("endGame",1, { label: "¡Has Perdido!" });
        }

      }}); 
      
      
    }
  }

});


/*********************************************************************/
// ## Define the class "Decorate" to objects who doesnt have movement
/*********************************************************************/
Q.Sprite.extend("Decorate", {

  init: function(p,defaults) {
    this._super(p, Q._defaults(defaults||{},{
      sprite: p.sprite,
      sheet: p.sprite,

      type: Q.SPRITE_NONE,
      collisionMask: Q.SPRITE_DEFAULT
    }));
  }

});


/*********************************************************************/
// ## Define the "abstract" class "NPC" (non playable character)
/*********************************************************************/
Q.Sprite.extend("NPC", {

  init: function(p,defaults) {
    this._super(p, Q._defaults(defaults||{},{
      sprite: p.sprite,
      sheet: p.sprite,
      typeNPC: p.typeNPC,
      direction: p.direction,
      sensor: true, 
      type: Q.SPRITE_FRIEND,
      collisionMask: Q.SPRITE_DEFAULT | Q.SPRITE_FRIEND
    }));

    this.add('animation');

    this.on("sensor");
  },

  step: function(dt) {
    if(this.p.typeNPC == "person") {
      this.play("stand_" + this.p.direction);
    } 
  }

});


/*********************************************************************/
// ## Define the Class Signal to show interact with them
/*********************************************************************/
Q.NPC.extend("Signal", {

  init: function(p) {
    this._super(p, {
    });


    this.add('animation');

    this.on("sensor");
  },

    sensor: function(colObj) {
      
      if(Q.inputs ['fire']) {
        
        var message_signal = "Siga probando...";

        if(colObj.isA("Jugador") && !this.p.dead) {      
          switch (this.p.mensaje) {
            case 1:
              message_signal = "No olvides que puedes aprovechar\ntu forma aerodinámica\ncontra tus enemigos\npulsando\n'Z + X'"; 
              break;
            case 2:
              message_signal = "Mucho cuidado por dónde andas.\nEl suelo puede volverse inseguro."; 
              break;
            case 3:
              message_signal = "Recuerda que puedes volver\nen cualquier momento\nhacia atrás."; 
              break;
          } 

          Q.stageScene("mensajePapiro",1, { label: message_signal });
        }
      }
      
  }
  
});


/*********************************************************************/
// ## Define the class Fez, a NPC character who gives some clues
/*********************************************************************/
Q.NPC.extend("Fez", {
  init: function(p) {
    this._super(p,{
      contador_mensajes: 1,
      processed: false
    });
  },

  sensor: function(colObj) { 


    if(Q.inputs['fire'] && !this.p.processed) {
        
        var message_signal = "Siga probando...";

        if(colObj.isA("Jugador") && !this.p.dead) {      
          switch (this.p.contador_mensajes) {
            case 1:
              message_signal = "Bienvenido a Egipto, joven explorador.\n\nSé que estás buscando los 8 mapas\nque muestran el camino hacia\nla cuarta pirámide de Guiza.\n\nLo siento, pero no te pudedo dar ninguna pista,\nasí que no insistas.";
              break;
            case 2:
              message_signal = "No te puedo dar ninguna pista,\ndeja de insistir,\nporque no te voy a revelar ningún secreto.....\n\njajajaja"; 
              break;
            case 3:
              message_signal = "Venga, si insistes....\n\n\nLo que estás buscando está allá.";
              break;
            case 4: 
              message_signal = "Allá es detrás de esa planta, pesado.\n\nY no me vuelvas a molestar con tonterias.";
              break;
            default:
              message_signal = "¡Ya te he dicho que me dejes en paz!\n\n¿Cuál de todas esas plantas?\nMira detrás de alguna.\n\njejejeje";
              break;
          } 
          this.p.contador_mensajes++;
          this.p.processed = true;
          Q.stageScene("mensajePapiro",1, { label: message_signal });
        }
        
      }

      if(!Q.inputs['fire'] && this.p.processed) {
        this.p.processed = false;
      }
  }
  
});


/*********************************************************************/
// ## Define the class Nomada, similar as Fez
/*********************************************************************/
Q.NPC.extend("Nomada", {
  init: function(p) {
    this._super(p,{
      processed: false
    });
  },

  sensor: function(colObj) {
    if(Q.inputs['fire'] && !this.p.processed) {
        
          var message_signal = "Siga probando...";

          if(colObj.isA("Jugador") && !this.p.dead) {      
            if(this.p.message == 1) {
              switch (this.p.contador_mensajes) {
                case 1:
                  message_signal = "¡Hey!\n¿Qué haces aquí?\n\nEl desierto es MUY duro y\nsi no tienes cuidado te vas a deshidratar.\nToma esta cantimplora\ny de vez en cuando come algo,\no si no te vas a morir.";
                  break;
                case 2:
                  message_signal = "Por cierto,\n\nten cuidado con ese barranco de la izquierda.\nNo te vayas a caer.";
                  break;
                default:
                  message_signal = "Ten cuidado, no te caigas...";
               }//Switch end 
                this.p.contador_mensajes++;
                this.p.processed = true;
                Q.stageScene("mensajePapiro",1, { label: message_signal });
            } else if(this.p.message == 2) {
              
              switch (this.p.contador_mensajes) {
                case 1:
                  message_signal = "Hola amigo.\n¿Necesitas ayuda o buscas algo?.";
                  break;
                case 2:
                  message_signal = "Lo único que te puedo decir\nes que has llegado muy lejos.\n¡No te rindas!\nLa gente insistente\nsiempre consigue cumplir sus metas.";
                  break;
                case 3:
                  message_signal = "Ya es la tercera vez que preguntas...\n\nDebes estar muy interesado\nen esa supuesta pirámide.\n\nEstabas buscando un mapa, ¿verdad?";
                  break;
                case 4:
                  message_signal = "Bueno... si insistes,\n\nTOMA ESTE PERGAMINO QUE ENCONTRÉ.\n\nNo sé si te servirá de algo...";
                  Q.state.inc("mapas", 1);
                  break; 
                default:
                  message_signal = "¡¡¡Déjame tranquilo!!!\n\nTe dije que insistieras, pero como sigas así\n te haré una oferta que no podrás rechazar... ";
                 break;

               } 

                this.p.contador_mensajes++;
                this.p.processed = true;
                Q.stageScene("mensajePapiro",1, { label: message_signal });
          }
        }
        
      }

      if(!Q.inputs['fire'] && this.p.processed) {
        this.p.processed = false;
      }
  }
  
});


/*********************************************************************/
// ## Define the class of the exit door (with 2 palms)
/*********************************************************************/
Q.NPC.extend("Exit", {
  init: function(p) {
    this._super(p,{
      processed: false
    });
  },
    sensor: function(colObj) {
      if(Q.inputs['fire'] && !this.p.processed) {
        if(colObj.isA("Jugador") && !this.p.dead) {
          if(Q.state.get("mapas") < 8) {
            Q.stageScene("mensajePapiro",1, { label: "Lo siento, para conecer la localización\nde la cuarta pirámide\ndebes seguir buscando los mapas ocultos.\n\nNadie dijo que fuera fácil, pero no desesperes.\n\n\n Sólo te quedan: " + (8 - Q.state.get("mapas")) });
          } else {
            Q.audio.stop('cairo_chase.ogg');
            this.stage.pause();
            Q.stageScene("endGame",1, { label: "¡Has Ganado!" });
          }
        }
      }

      if(!Q.inputs['fire'] && this.p.processed) {
        this.p.processed = false;
      }
      
    }
});


/*********************************************************************/
// ## Define the class quicksand, that moves you to the floor
/*********************************************************************/
Q.Sprite.extend("Quicksand", {
  init: function(p) {
    this._super(p, {
      // Default values   
      vx: 0, 
      gravity: 0,
      sprite: "quicksand",
      sheet: "quicksand", // Setting a sprite sheet sets sprite width and height
      type: Q.SPRITE_NOCOLLISION,
      sensor: true,
      procesado: false, 
      collisionMask: Q.SPRITE_PLAYER | Q.SPRITE_ENEMY
    });


    this.add('animation');
    this.on("sensor");
  },
  
  sensor: function(colObj) {
    
    if(colObj.isA("Jugador"))
    {
      if(!this.p.procesado && !Q.inputs['up']) {
        this.p.procesado = true; 
        colObj.p.vy = 10;
        //if he comes out of quicksand, he has gravity again.
        if(colObj.p.y < 513)
          colObj.p.gravity = 0;
        else 
          colObj.p.gravity = 1;
      

      } else if(!this.p.procesado && Q.inputs['up']) {
       
        this.p.procesado = true; 
        colObj.p.gravity = 1;
        colObj.p.vy = -150;
      } else {
      
        this.p.procesado = false;
        colObj.p.gravity = 1;
      }
    }
  },

  step: function(dt) {
    this.play("stand");
  }

});


/*********************************************************************/
// ## Define the class Collectable, for all the items
/*********************************************************************/
Q.Sprite.extend("Collectable", {
  
  init: function(p) {
    this._super(p,{
      sprite: p.sprite,
      sheet: p.sprite,
      type: Q.SPRITE_COLLECTABLE,
      collisionMask: Q.SPRITE_PLAYER,
      sensor: true,
      vx: 0,
      vy: 0,
      gravity: 0,
      processed: false
    });

    this.add("animation, tween");

    this.on("sensor");
  },

  // When a Collectable is hit.
  sensor: function(colObj) {
    // Increment the score.
    if(!this.p.processed)
    {
      this.p.processed = true;
      this.anim();
    }
  },

  anim: function() {
    this.animate({ x: this.p.x, y: this.p.y-25, angle: 0 }, 0.25, Q.Easing.Linear, {callback: function() { this.destroy(); }});
  }
});


/*********************************************************************/
// ## Define the class Alimento, that can have agua y comida 
/*********************************************************************/
Q.Collectable.extend("Alimento", {
  // When a Agua is hit.
  sensor: function(colObj) {
  
    if(!this.p.processed)
    {
      this.p.processed = true;

      if(this.p.sprite == "cantimplora") {
        Q.audio.play('drink_slurp.ogg', { loop: false });
      } else {
        Q.audio.play('eat_crunch_apple.ogg', { loop: false });
      }

      if(this.p.agua)
        Q.state.inc("agua", this.p.agua);

      if(this.p.comida)
        Q.state.inc("comida", this.p.comida); 

      this.anim();
    }
  }

});


/*********************************************************************/
// ## Define the class Map, that is used to finish the game
/*********************************************************************/
Q.Sprite.extend("Maps", {

  init: function(p) {
    this._super(p, {
      // Default values   
      sprite: "paper_roll",
      sheet: "paper_roll", // Setting a sprite sheet sets sprite width and height
      frame: 0, 
      gravity: 0, 
      type: Q.SPRITE_COLLECTABLE,
      collisionMask: Q.SPRITE_DEFAULT | Q.SPRITE_PLAYER
    });


    this.add('2d');

    this.on("hit",this,"collision");
  },

    collision: function(col) {
      if(col.obj.isA("Jugador") && !this.p.dead) {     
        Q.state.inc("mapas", 1); 
        Q.stageScene("mensajePapiro",1, { label: "Has encontrado el Mapa " + Q.state.get("mapas") });     
        this.destroy();
      }
    }
});


/*********************************************************************/
// ## Define the class Camel
/*********************************************************************/
Q.Sprite.extend("Camel", {

  init: function(p,defaults) {
    this._super(p, Q._defaults(defaults||{},{
      sprite: p.sprite,
      sheet: p.sprite,
      direction: p.direction,
      anim_counter: 0,
      anim_state: 0, //estado de las animaciones: 0 (stand), 1 (duck), 2(eat)
      
      type: Q.SPRITE_NONE,
      collisionMask: Q.SPRITE_DEFAULT | Q.SPRITE_ENEMY | Q.SPRITE_FRIEND
    }));

    this.add('animation');
    this.play("stand_" + this.p.direction);

  },

  step: function(dt) {
    this.p.anim_counter = this.p.anim_counter + dt;
    if(this.p.anim_counter >= 9) //each 9 secs change the animation in a random mode
    {
      var alea = Math.floor((Math.random()*3)); //return values between 0 and 2
      
      //change the animation
      if(alea == 0) //stand
      {
        if(this.p.anim_state == 1)
        {
          this.play("post_duck_" + this.p.direction);
          this.p.anim_state = 0;
        } else if (this.p.anim_state == 2)
        {
          this.play("post_eat_" + this.p.direction);
          this.p.anim_state = 0;
        }
      } else if (alea == 1) //duck
      {
        if(this.p.anim_state == 0)
        {
          this.play("pre_duck_" + this.p.direction);
          this.p.anim_state = 1;
        }
      } else if (alea == 2) //eat
      {
        if(this.p.anim_state == 0)
        {
          this.play("pre_eat_" + this.p.direction);
          this.p.anim_state = 2;
        }
      }
      
      this.p.anim_counter = 0;
    }

  }

});


/*********************************************************************/
// ## Define the "abstract" class "Enemy"
/*********************************************************************/
Q.MovingSprite.extend("Enemy", {

  init: function(p,defaults) {
    this._super(p, Q._defaults(defaults||{},{
      sprite: p.sprite,
      sheet: p.sprite,
      dead: false,
      processed: false,

      type: Q.SPRITE_ENEMY,
      collisionMask: Q.SPRITE_DEFAULT | Q.SPRITE_ENEMY
    }));

    this.add('2d, aiBounce, animation');
    this.on("bump.top",this,"stomp");
    this.on("hit.sprite",this,"hit");
    this.on("destroy", this, "destroy");
  },

  step: function(dt) {
    if(this.p.dead) {

      this.del('2d, aiBounce');

      return;
    }

    this._super(dt);
  },

  hit: function(col) {
    if(col.obj.isA("Jugador") && !this.p.dead) {
      if(Q.inputs['run'] && Q.inputs['action'] && col.obj.p.vx != 0) { //its rolling
        this.stomp(col);
      } else {
        col.obj.trigger('enemy.hit', {"enemy":this,"col":col});
      }
    }
  },

  stomp: function(col) {

    if(col.obj.isA("Jugador") && !col.obj.p.dead) {

      if(!this.p.processed) {
         Q.audio.play('dead_enemy.ogg');
         this.p.processed = true;
      }

      this.p.dead = true;
      this.p.vx=this.p.vy=0;
      col.obj.p.vy = -300;
      this.play("die", 10);    
    }
  }

});


/*********************************************************************/
// ## Define the class Snake, implementing Enemy
/*********************************************************************/
Q.Enemy.extend("Snake", {
  init: function(p) {
    this._super(p,{
      points: [ [-30, -5], [-30, 10], [30, 10], [30, -5]] //modify the collision bounding box 
    });
  },

  step: function(dt) {
    this._super(dt);

    //Animations
    if(this.p.vx != 0) {
      if(this.p.vx > 0)
        this.play("walk_right");
      else if(this.p.vx < 0)
        this.play("walk_left");
    } else {
      this.play("stand");
    }
  }
  
});


/*********************************************************************/
// ## Define the class Fire, implementing Enemy
/*********************************************************************/
Q.Enemy.extend("Fire", {
  init: function(p) {
    this._super(p,{
      points: [ [-14, -30], [-14, 40], [14, 40], [14, -30]] //modify the collision bounding box
    });
  },

  step: function(dt) {
    this._super(dt);
    this.play('stand');
  },

  stomp: function(col) {

  }
});










/*********************************************************************/
// ## Define the start menu scene
/*********************************************************************/
Q.scene("mainTitle", function(stage) {

  Q.audio.stop(); // Everything will stop playing
  Q.audio.play('main_title.ogg', { loop: false });


  //Define, capa por capa, la escena de inicio del juego, las animaciones y el botón de JUGAR
  var fondo = stage.insert(new Q.Repeater( { asset: "start_01.png"} ));
  
  var piramide = stage.insert(new Q.Sprite( { asset: "start_02.png", x: 480, y: 720 } ), fondo);
    piramide.add('tween');
    piramide.animate({ x: piramide.p.x, y: piramide.p.y-400, angle: 0 }, 10, Q.Easing.Linear, { delay: 1 }); 
  
  var dunas = stage.insert(new Q.Repeater( { asset: "start_03.png"} ), fondo);
  
  var texto = stage.insert(new Q.Sprite( { asset: "start_04.png", x: 480, y: -320 } ), fondo);
    texto.add('tween');
    texto.animate({ x: texto.p.x, y: texto.p.y+640, angle: 0 }, 0.5, Q.Easing.Linear, { delay: 12, callback: function() {

      var container = stage.insert(new Q.UI.Container({
        x: Q.width/2, y: (Q.height*5/6)-50, fill: "rgba(0,0,0,0.5)"
        }));

      var button = container.insert(new Q.UI.Button({ x: 0, y: 0, fill: "#CCCCCC",
                                                    label: "  Jugar  ", sheet: "ladrilloboton", keyActionName: "confirm" }))         
      
      button.on("click",function() {
        Q.clearStages();
        Q.stageScene('level1');
        Q.stageScene("HUD", 3);
      });

      var button2 = container.insert(new Q.UI.Button({ x: 0, y: 50, fill: "#CCCCCC",
                                                    label: "  Controles  ", sheet: "ladrilloboton", keyActionName: "confirm" }))         
      
      button2.on("click",function() {
        Q.clearStages();
        Q.stageScene('controles');
      });

      var button3 = container.insert(new Q.UI.Button({ x: 0, y: 100, fill: "#CCCCCC",
                                                    label: "  Créditos  ", sheet: "ladrilloboton", keyActionName: "confirm" }))         
      
      button3.on("click",function() {
        Q.clearStages();
        Q.stageScene('creditos');
      });

      container.fit(25);

    }});

    Q.state.set("vidas",3);
});


/*********************************************************************/
// ## Define the controls menu scene
/*********************************************************************/
Q.scene("controles", function(stage) {

  //Define, capa por capa, la escena de inicio del juego, las animaciones y el botón de JUGAR
  var fondo = stage.insert(new Q.Repeater( { asset: "controles.png"} ));

  var container = stage.insert(new Q.UI.Container({
    x: (Q.width*5/6), y: (Q.height*4/6), fill: "rgba(0,0,0,0.5)"
    }));

  var button = container.insert(new Q.UI.Button({ x: 0, y: 100, fill: "#CCCCCC",
                                                label: "  Volver  ", sheet: "ladrilloboton", keyActionName: "confirm" }))         
  
  button.on("click",function() {
    Q.clearStages();
    Q.stageScene('mainTitle');
  });

  container.fit(25);
});


/*********************************************************************/
// ## Define the credits menu scene
/*********************************************************************/
Q.scene("creditos", function(stage) {

  Q.audio.stop(); // Everything will stop playing
  Q.audio.play('the_builder.ogg', { loop: true });

  //Define, capa por capa, la escena de inicio del juego, las animaciones y el botón de JUGAR
  var fondo = stage.insert(new Q.Repeater( { asset: "creditos_fondo.png"} ));

  var texto = stage.insert(new Q.Sprite( { asset: "creditos_texto.png", x: 480, y: 1770 } ), fondo);
    texto.add('tween');
    texto.animate({ x: texto.p.x, y: -Q.height-150, angle: 0 }, 20, Q.Easing.Linear);

  var container = stage.insert(new Q.UI.Container({
    x: Q.width/2, y: (Q.height*5/6)-50, fill: "rgba(0,0,0,0.5)"
    }));

  var button = container.insert(new Q.UI.Button({ x: 0, y: 100, fill: "#CCCCCC",
                                                label: "  Volver  ", sheet: "ladrilloboton", keyActionName: "confirm" }))         
  
  button.on("click",function() {
    Q.clearStages();
    Q.stageScene('mainTitle');
  });

  container.fit(25);
});


/*********************************************************************/
// ## Define the HUD scene
/*********************************************************************/
Q.scene("HUD", function(stage) {
  var container = stage.insert(new Q.UI.Container({
      x: 50, y: 0
    }));

  var label_vidas_bg = container.insert(new Q.UI.Text({x:52, y: 32,
      label: "Vidas: " + Q.state.get("vidas"), color: "black", size: 40 }));
    var label_vidas = container.insert(new Q.UI.Text({x:50, y: 30,
      label: "Vidas: " + Q.state.get("vidas"), color: "orange", size: 40 }));

  var label_agua_bg = container.insert(new Q.UI.Text({x:252, y: 22,
      label: "Agua: " + Q.state.get("agua"), color: "black", size: 20}));
    var label_agua = container.insert(new Q.UI.Text({x:250, y: 20,
      label: "Agua: " + Q.state.get("agua"), color: "orange", size: 20}));

    var label_comida_bg = container.insert(new Q.UI.Text({x:252, y: 52,
      label: "Comida: " + Q.state.get("comida"), color: "black", size: 20}));
    var label_comida = container.insert(new Q.UI.Text({x:250, y: 50,
      label: "Comida: " + Q.state.get("comida"), color: "orange", size: 20}));

    var label_mapas_bg = container.insert(new Q.UI.Text({x:452, y: 52,
      label: "Mapas: " + Q.state.get("mapas"), color: "black", size: 20}));
    var label_mapas = container.insert(new Q.UI.Text({x:450, y: 50,
      label: "Mapas: " + Q.state.get("mapas"), color: "orange", size: 20}));

    container.fit(20);

    Q.state.on("change.vidas", this, function() {
    label_vidas_bg.p.label = "Vidas: " + Q.state.get("vidas");
    label_vidas.p.label = "Vidas: " + Q.state.get("vidas");
  });

  Q.state.on("change.agua", this, function() {
    if (Q.state.get("agua") > 100 ) {
      Q.state.set("agua", 100);
    }
    if(Q.state.get("agua") >= 0 ) {
      label_agua_bg.p.label = "Agua: " + Q.state.get("agua");
      label_agua.p.label = "Agua: " + Q.state.get("agua");
    }
  });

  Q.state.on("change.comida", this, function() {
    if (Q.state.get("comida") > 100 ) {
      Q.state.set("comida", 100);
    }
    if(Q.state.get("comida") >= 0 ) {
      label_comida_bg.p.label = "Comida: " + Q.state.get("comida");
      label_comida.p.label = "Comida: " + Q.state.get("comida");
    }
  });

  Q.state.on("change.mapas", this, function() {
    if(Q.state.get("mapas") >= 0 ) {
      label_mapas_bg.p.label = "Mapas: " + Q.state.get("mapas");
      label_mapas.p.label = "Mapas: " + Q.state.get("mapas");
    }
  });

});


/*********************************************************************/
// ## Define a scene with a message in a papyrus and a button
// ## This scene must be invoked in the layer number 1 "Q.stageScene("mensajePapiro",1);"
/*********************************************************************/
Q.scene("mensajePapiro", function(stage) {
  
  var papiro = stage.insert(new Q.Sprite( { asset: "papiro.png", x: 480, y: 320 } ));

  var container = stage.insert(new Q.UI.Container({
    x: Q.width/2, y: Q.height/2, fill: "rgba(0,0,0,0.3)"
  }));

  var label = container.insert(new Q.UI.Text({ x:0, y: 0, 
                                                   label: stage.options.label, align: 'center' }));

  var button = container.insert(new Q.UI.Button({ x: 0, y: Q.height/4,
                                                  label: "Continuar", sheet: "ladrilloboton", keyActionName: "confirm" }));         
  
  button.on("click",function() {   
    Q.clearStage(1);
    Q.stage(0).unpause();
  });

  container.fit(500);
  Q.stage(0).pause();

});


/*********************************************************************/
// ## Define the main scene
/*********************************************************************/
Q.scene("level1", function(stage) {
  Q.audio.stop(); // Everything will stop playing
  Q.audio.play('cairo_chase.ogg', { loop: true });

  Q.stageTMX("level1.tmx",stage);

  Q.state.set("agua", 100);
  Q.state.set("comida", 100);
  Q.state.set("mapas", 0);

  //The main viewport
  stage.add("viewport");
  stage.viewport.centerOn(480, 320);
  stage.viewport.offsetY = 60;

});


/*********************************************************************/
// ## Define the end scene (with the restart button)
/*********************************************************************/
Q.scene('endGame',function(stage) {
  var container = stage.insert(new Q.UI.Container({
    x: Q.width/2, y: Q.height/2, fill: "rgba(0,0,0,0.5)"
  }));

  var button = container.insert(new Q.UI.Button({ x: 0, y: 0, fill: "#CCCCCC",
                                                  label: "Otra vez", sheet: "ladrilloboton" }))         
  var label = container.insert(new Q.UI.Text({x:0, y: -10 - button.p.h, 
                                                   label: stage.options.label }));
  button.on("click",function() {
    Q.clearStages();
    Q.stageScene("mainTitle");
  });

  container.fit(20);
});






/*********************************************************************/
// ## Asset Loading and Game Launch
/*********************************************************************/
// assets that are already loaded will be skipped
Q.loadTMX("level1.tmx, start_01.png, start_02.png, start_03.png, start_04.png, controles.png, creditos_fondo.png, creditos_texto.png, papiro.png, ladrilloboton.png, ladrilloboton.json, wario(48x60).png, wario.json, fez(40x68).png, fez.json, nomada(33x58).png, nomada.json, camel_stand(100x86).png, camel_stand.json, camel(140x92).png, camel.json, snake_green(60x40).png, snake_green.json, signal.png, signal.json, 100_plants(94x80).png, plants.json, paper_roll.png, paper_roll.json, quicksand(120x120).png, quicksand.json, food(28x28).png, food.json, vertical_flame(32x80).png, fire.json, exit(184x150).png, exit.json, cairo_chase.mp3, cairo_chase.ogg, drink_slurp.mp3, drink_slurp.ogg, eat_crunch.mp3, eat_crunch.ogg, eat_crunch_apple.mp3, eat_crunch_apple.ogg, main_title.mp3, main_title.ogg, dead_player.mp3, dead_player.ogg, dead_enemy.mp3, dead_enemy.ogg, roll.mp3, roll.ogg, the_builder.mp3, the_builder.ogg", function(){
  // Sprites sheets can be created manually
  //Q.sheet("tiles","tiles.png", { tilew: 32, tileh: 32 });
  // Or can be created from a .json asset that defines sprite locations 
  Q.compileSheets("ladrilloboton.png", "ladrilloboton.json");
  Q.compileSheets("wario(48x60).png", "wario.json");
  Q.compileSheets("fez(40x68).png", "fez.json");
  Q.compileSheets("nomada(33x58).png", "nomada.json");
  Q.compileSheets("camel_stand(100x86).png", "camel_stand.json");
  Q.compileSheets("camel(140x92).png", "camel.json");
  Q.compileSheets("snake_green(60x40).png", "snake_green.json");
  Q.compileSheets("signal.png", "signal.json");
  Q.compileSheets("100_plants(94x80).png", "plants.json");
  Q.compileSheets("paper_roll.png", "paper_roll.json");
  Q.compileSheets("quicksand(120x120).png", "quicksand.json");
  Q.compileSheets("food(28x28).png", "food.json");
  Q.compileSheets("vertical_flame(32x80).png", "fire.json");
  Q.compileSheets("exit(184x150).png", "exit.json");


  //Make the animations
  Q.animations("wario", {
    stand_right: { frames:[0,0,0,0,0,0,0,0,0,0,2], rate: 0.5, flip: false },
    stand_left: { frames: [0,0,0,0,0,0,0,0,0,0,2], rate: 0.5, flip: 'x' },
    walk_right: { frames: [3,4,5,6], rate: 0.3, flip: false, loop: false, next: 'stand_right' },
    walk_left: { frames:  [3,4,5,6], rate: 0.3, flip: 'x', loop: false, next: 'stand_left' },
    run_right: { frames: [3,4,5,6], rate: 0.2, flip: false, loop: false, next: 'stand_right' },
    run_left: { frames:  [3,4,5,6], rate: 0.2, flip: 'x', loop: false, next: 'stand_left' },
    jump_right: { frames: [7], rate: 0.5, flip: false },
    jump_left: { frames:  [7], rate: 0.5, flip: 'x' },
    roll_right: { frames: [12,13,14,15,16,17,18,19], rate: 0.2, flip: false, loop: false, next: 'stand_right' },
    roll_left: { frames:  [12,13,14,15,16,17,18,19], rate: 0.2, flip: 'x', loop: false, next: 'stand_left' },
    dead_right: { frames:[14], rate: 1, flip: 'xy' },
    dead_left: { frames: [14], rate: 1, flip: 'y' },
    duck_right: { frames: [9], rate: 0.1, flip: false, loop: false },
    duck_left: { frames:  [9], rate: 0.1, flip: "x", loop: false }
  });
  Q.animations("fez", {
    stand_right: { frames:[0,0,0,0,0,0,0,0,1], rate: 0.75, flip: false },
    stand_left: { frames: [0,0,0,0,0,0,0,0,1], rate: 0.75, flip: 'x' }
  });
  Q.animations("nomada", {
    stand_right: { frames:[0,0,0,0,0,0,0,1], rate: 1, flip: false },
    stand_left: { frames: [0,0,0,0,0,0,0,1], rate: 1, flip: 'x' }
  });

  Q.animations("camel", {
    stand_right: { frames:[1,1,1,2,3,2], rate: 1.5, flip: false },
    stand_left: { frames: [1,1,1,2,3,2], rate: 1.5, flip: 'x' },
    walk_right: { frames: [4,5,6,7,13,14], rate: 0.4, flip: false, loop: false, next: 'stand_right' },
    walk_left: { frames:  [4,5,6,7,13,14], rate: 0.4, flip: 'x', loop: false, next: 'stand_left' },
    run_right: { frames: [4,5,6,7,8,9,10,11,12,13,14], rate: 0.15, flip: false, loop: false, next: 'stand_right' },
    run_left: { frames:  [4,5,6,7,8,9,10,11,12,13,14], rate: 0.15, flip: 'x', loop: false, next: 'stand_left' },
    
    pre_duck_right: { frames:[16,17,18], rate: 1, flip: false, loop: false, next: 'duck_right' },
    pre_duck_left: { frames:[16,17,18], rate: 1, flip: 'x', loop: false, next: 'duck_left' },
    duck_right: { frames:[19,20,21,22,23,24], rate: 1.5, flip: false },
    duck_left: { frames: [19,20,21,22,23,24], rate: 1.5, flip: 'x' },
    post_duck_right: { frames:[18,17,16], rate: 1, flip: false, loop: false, next: 'stand_right' },
    post_duck_left: { frames:[18,17,16], rate: 1, flip: 'x', loop: false, next: 'stand_left' },
    
    pre_eat_right: { frames:[25,26,27], rate: 1, flip: false, loop: false, next: 'eat_right' },
    pre_eat_left: { frames:[25,26,27], rate: 1, flip: 'x', loop: false, next: 'eat_left' },
    eat_right: { frames:[28,29,30,31], rate: 1, flip: false },
    eat_left: { frames: [28,29,30,31], rate: 1, flip: 'x' },
    post_eat_right: { frames:[27,26,25], rate: 1, flip: false, loop: false, next: 'stand_right' },
    post_eat_left: { frames:[27,26,25], rate: 1, flip: 'x', loop: false, next: 'stand_left' }
  });
  Q.animations("snake_green", {
    stand: { frames: [0], rate: 1 },
    walk_right: { frames: [0,1,2], rate: 1/3, loop: false, flip: 'x'},
    walk_left: { frames: [0,1,2], rate: 1/3, loop: false, flip: false},
    die: { frames: [0], rate: 3, loop: false, flip: 'y', trigger: "destroy"}
  });
  Q.animations("quicksand", {
    stand: { frames: [0,1,2], rate: 1/2, loop: false}
  });
  Q.animations("fire", {
    stand: { frames: [0,1,2,3], rate: 1/3, loop:true}
  });

  // Finally, call stageScene to run the game
  Q.stageScene("mainTitle");
  //Q.state.set("vidas",3); //These lines are for debug
  //Q.stageScene('level1');
  //Q.stageScene("HUD", 3);
});

});