window.addEventListener("load", function(){
    class GridCoord{
        constructor(type, direction, color){
            this.type = type;
            this.direction = direction;
            this.color = color;
        }
    }
    
    class Grid{
        constructor(difficulty, width, height){
            this.strokeLength = Math.min(width,length)/10;
            this.size = 5;
            this.grid = [];
            this.width = width;
            this.height = height;
            this.map = new Map();
            for (let i = 0; i < this.size; i++){
                this.grid.push([]);
                for (let j = 0; j < this.size; j++){
                    this.grid[0].push(0);
                }
            }
        }

        draw(ctx){
            ctx.strokeStyle = "white";
            ctx.lineWidth = this.strokeLength;

            ctx.beginPath();
            ctx.moveTo(this.width + 10, this.height + 10);
            ctx.lineTo(this.width + 10, this.height + 3*this.height/4);
            ctx.stroke();
        }
    }

    const canvas = this.document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const test = new Grid("easy", canvas.width, canvas.length);

    function animate(){
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "black"; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        test.draw(ctx);

        requestAnimationFrame(animate);
    }
    animate();
});