



window.addEventListener("load", function(){

    class Flow{
        constructor(startX, startY, width, height, color, direction){
            this.end = false;
            this.turn = false;
            this.startX = 
            this.posX = startX;
            this.posY = startY;
            this.color = color;
            this.direction = direction;
            this.travel;
            this.turnX = startX;
            this.turnY = startY;
            if (direction%2 === 0){
                this.travel = Math.floor(height*Math.random());
                this.turnY = this.travel;
            }   
            else{
                this.travel = Math.floor(width*Math.random());
                this.turnX = this.travel;
            }
        }
        newdirection(check){
            if (check === this.travel && this.turn == false){
                console.log("hello");
                this.direction = (3 + this.direction + Math.floor(3*Math.random()))%4;
                console.log(this.direction);
                this.turn = true;
            }
        }
        update(){
            if (this.end === false){
                if (this.direction == 0){
                    this.posY -= 1;
                    this.newdirection(this.posY);
                }   
                else if (this.direction == 1){
                    this.posX += 1;
                    this.newdirection(this.posX);
                }
                else if (this.direction == 2){
                    this.posY += 1;
                    this.newdirection(this.posY);
                }
                else{
                    this.posX -= 1;
                    this.newdirection(this.posX);
                }
            }
        }

        draw(ctx) {
            if (this.turn){
                ctx.fillSyle = this.color;
                ctx.lineWidth = 10;
                ctx.moveTo(this.startX, this.startY);
                ctx.lineTo(this.turnX,this.turnY);
                ctx.lineTo(this.posX, this.posY);
                ctx.stroke();
            }
            else{
                ctx.strokeStyle = this.color;
                ctx.lineWidth = 10;
                ctx.moveTo(this.startX, this.startY);
                ctx.lineTo(this.posX, this.posY);
                ctx.stroke();
            }
        }

    }

    const canvas = this.document.getElementById("backgroundCanvas");
    const ctx = canvas.getContext("2d");

    const flows = [];

    let line = new Flow(20,0,canvas.width,canvas.height,"red",2);
    function animate(){
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = "black"; // Set the background color to lightblue, for example
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = "red";
        ctx.lineWidth = 10;
        ctx.strokeRect(125,25,150,50);

        line.update();
        line.draw(ctx);
        requestAnimationFrame(animate);
    }

    function createFlow(){
        
    }

    animate();

});