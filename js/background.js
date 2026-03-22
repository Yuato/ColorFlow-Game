/**
* Tony Yuan
* March 9 2026
* Javascript file that displays the background of the splash page and
  delays the buttons from showing
**/
window.addEventListener("load", function(){

    class Flow{

        /**
         * Creates a flow line starting from a given position, moving in a given direction,
         * then turning once at a random point before continuing off screen
         *
         * @param {Number} startX - starting x position in pixels
         * @param {Number} startY - starting y position in pixels
         * @param {Number} width - canvas width in pixels
         * @param {Number} height - canvas height in pixels
         * @param {String} color - css color string for the line
         * @param {Number} direction - 0=up, 1=right, 2=down, 3=left
         */
        constructor(startX, startY, width, height, color, direction){
            this.end = false;
            this.turn = false;
            this.startX = startX;
            this.startY = startY;
            this.width = width;
            this.height = height;
            this.posX = startX;
            this.posY = startY;
            this.color = color;
            this.direction = direction;
            this.travel;
            this.turnX = startX;
            this.turnY = startY;
            if (direction%2 === 0){
                this.travel = 50+Math.floor((this.height-100)*Math.random());
                this.turnY = this.travel;
            }   
            else{
                this.travel = 50+Math.floor((this.width-100)*Math.random());
                this.turnX = this.travel;
            }
        }

        /**
         * Changes direction once when the flow reaches its turn point
         *
         * @param {Boolean} check - true when the flow has reached the turn threshold
         */
        newdirection(check){
            if (check && this.turn === false){
                this.direction = (3 + this.direction + Math.floor(3*Math.random()))%4;
                this.turn = true;
            }
        }

        /**
         * Moves the flow forward each frame and marks it as ended if it goes off screen
         */
        update(){
            let speed = Math.min(this.width,this.height)/300;
            if (this.end === false){
                if (this.direction == 0){
                    this.posY -= speed;
                    this.newdirection(this.posY <= this.travel);
                }   
                else if (this.direction == 1){
                    this.posX += speed;
                    this.newdirection(this.posX >= this.travel);
                }
                else if (this.direction == 2){
                    this.posY += speed;
                    this.newdirection(this.posY >= this.travel);
                }
                else{
                    this.posX -= speed;
                    this.newdirection(this.posX <= this.travel);
                }
            }
            if (this.posX < 0 || this.posX > this.width){
                this.end = true;
            }
            else if (this.posY < 0 || this.posY > this.height){
                this.end = true;
            }
        }

        /**
         * Draws the flow line from its start position through its turn point to its current position
         *
         * @param {CanvasRenderingContext2D} ctx
         */
        draw(ctx) {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 10;
            ctx.beginPath()
            ctx.moveTo(this.startX, this.startY);
            if (this.turn){
                ctx.lineTo(this.turnX,this.turnY);
            }
            ctx.lineTo(this.posX, this.posY);
            ctx.stroke();
        }
    }

    /**
     * Creates a new Flow with a random color, random edge start position, and random direction,
     * then pushes it into the given array
     *
     * @param {Array<Flow>} array - the flows array to push the new flow into
     */
    function generateFlows(array){
        let red = Math.floor(200*Math.random())+50;
        let blue = Math.floor(200*Math.random())+50;
        let green = Math.floor(200*Math.random())+50;
        let color = "rgb("+red+","+blue+","+green+")";
        let startX = 0;
        let startY = 0;
        let direction = Math.floor(Math.random()*4);
        if (direction%2 === 0){
            startX = 50+Math.floor((canvas.width-100)*Math.random());
            if (direction == 0){
                startY = canvas.height;
            }
        }   
        else{
            startY = 50+Math.floor((canvas.height-100)*Math.random());
            if (direction == 3){
                startX = canvas.width;
            }
        }
        array.push(new Flow(startX,startY,canvas.width,canvas.height,color,direction));
    }

    /**
     * Returns true if every flow in the array has gone off screen
     *
     * @param {Array<Flow>} array - the flows array to check
     * @returns {Boolean}
     */
    function checkFlows(array){
        let end = true;
        for (let i = 0; i < array.length; i++){
            end = (end && array[i].end);
        }
        return end;
    }

    /**
     * Reveals the button container after a 5 second delay
     */
    setTimeout(function(){
        document.getElementById("buttons").style.display = "block";
    }, 5000);

    const canvas = this.document.getElementById("backgroundCanvas");
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const flows = [];

    /**
     * Clears the canvas each frame, generates new flows when all are finished,
     * then updates and draws every active flow
     */
    function animate(){
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "black"; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (checkFlows(flows)){
            if (flows.length == 10){
                flows.length = 0;
            }
            generateFlows(flows);
        }

        for (let i = 0; i < flows.length; i++){
            flows[i].update();
            flows[i].draw(ctx);
        }

        requestAnimationFrame(animate);
    }

    animate();

});