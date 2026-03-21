window.addEventListener("load", function(){
    const EMPTY = null;
    const DIRS  = [{ r: -1, c: 0 }, { r: 1, c: 0 }, { r: 0, c: -1 }, { r: 0, c: 1 }];

    class Grid{
        constructor(difficulty, width, height){
            this.difficulty = difficulty;
            this.size = 5;
            this.width = width;
            this.height = height;
            this.colors = ['purple', 'teal', 'orange', 'coral'];

            this.frameMin = Math.min(width, height);
            this.strokeLength = this.frameMin / 100;
            this.x = (this.width - this.frameMin) / 2 + 10;
            this.y = (this.height - this.frameMin) / 2 + 10;
            this.cellSize = (this.frameMin-20)/this.size;

            this.solutionGrid = generateFlowGrid(this.size,4);
            this.userEndpoints = [];
            for (let i = 0; i < this.solutionGrid.endpoints.length; i++){
                this.userEndpoints.push({
                    color: this.solutionGrid.endpoints[i].color,
                    start: this.solutionGrid.endpoints[i].start,
                    end: this.solutionGrid.endpoints[i].end,
                });
            }
            this.userGrid = makeGrid(this.size);
            
            this.isDragging = false;
        }

        drawGrid(ctx){
            ctx.strokeStyle = "white";
            ctx.lineWidth = this.strokeLength;
            let x = (this.width - this.frameMin) / 2 + 10;
            let y = (this.height - this.frameMin) / 2 + 10;
            let length = this.frameMin-20;

            ctx.strokeRect(this.x, this.y, length, length);

            let size = 0;

            if (this.difficulty == "easy"){
                size = 5;
            }
            for (let i = 1; i < size; i++){
                    ctx.beginPath();
                    ctx.moveTo(this.x + i*length/5, this.y);
                    ctx.lineTo(this.x + i*length/5, this.y + length);
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.moveTo(this.x, this.y + i*length/5);
                    ctx.lineTo(this.x + length, this.y + i*length/5);
                    ctx.stroke();
                }
        }

        drawSolution(ctx){
            
            let cellSize = (this.frameMin-20)/this.size;
            let grid = this.solutionGrid;
            let endpoints = this.solutionGrid.endpoints;
            

            for (const endpoint of endpoints){
                let path = endpoint.path;
                ctx.beginPath();
                ctx.strokeStyle = this.colors[endpoint.color];
                ctx.lineWidth = cellSize * 0.4;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.moveTo(
                    this.x + path[0].c * cellSize + cellSize / 2,
                    this.y + path[0].r * cellSize + cellSize / 2
                );
                for (let i = 1; i < path.length; i++) {
                    ctx.lineTo(
                        this.x + path[i].c * cellSize + cellSize / 2,
                        this.y + path[i].r * cellSize + cellSize / 2
                    );
                }
                ctx.stroke();
            }
        }

        drawEndpoints(ctx){
            let r = null;
            let c = null
            let color = null;
            for (let i = 0; i < this.userEndpoints.length; i++){
                color = this.colors[this.userEndpoints[i].color];
                r = this.x + (this.userEndpoints[i].start.r+0.5) * this.cellSize;
                c = this.y + (this.userEndpoints[i].start.c+0.5) * this.cellSize;
                ctx.beginPath();
                ctx.strokeStyle = color;
                ctx.arc(r, c, this.cellSize/3, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
                ctx.stroke();

                r = this.x + (this.userEndpoints[i].end.r+0.5) * this.cellSize;
                c = this.y + (this.userEndpoints[i].end.c+0.5) * this.cellSize;
                ctx.beginPath();
                ctx.strokeStyle = color;
                ctx.arc(r, c, this.cellSize/3, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
                ctx.stroke();
            }
            
        }

        update(ctx){

        }
    }

    function makeGrid(size){
        const grid = [];
        for (let r = 0; r < size; r++){
            grid.push([]);
            for (let c = 0; c < size; c++){
                grid[r].push(EMPTY);
            }
        }
        return grid;
    }

    function shuffle(arr){
        for (let i = arr.length - 1; i > 0; i--){
            const j = Math.floor(Math.random() * (i + 1));
            const temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
        }
        return arr;
    }

    function getNeighbors(r, c, size){
        const result = [];
        for (let i = 0; i < DIRS.length; i++){
            const nr = r + DIRS[i].r;
            const nc = c + DIRS[i].c;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size){
                result.push({ r: nr, c: nc });
            }
        }
        return result;
    }

    function partitionGrid(size, numColors){
        const region = makeGrid(size);
        const queue  = [];

        const allCells = [];
        for (let i = 0; i < size * size; i++){
            allCells.push({ r: Math.floor(i / size), c: i % size });
        }
        shuffle(allCells);

        for (let col = 0; col < numColors; col++){
            const seed = allCells[col];
            region[seed.r][seed.c] = col;
            queue.push({ r: seed.r, c: seed.c, color: col });
        }

        let head = 0;
        while (head < queue.length){
            const batchEnd = Math.min(head + numColors * 2, queue.length);
            const batch    = queue.slice(head, batchEnd);
            shuffle(batch);

            for (let i = 0; i < batch.length; i++){
                const r     = batch[i].r;
                const c     = batch[i].c;
                const color = batch[i].color;
                const nbs   = shuffle(getNeighbors(r, c, size));

                for (let j = 0; j < nbs.length; j++){
                    const nb = nbs[j];
                    if (region[nb.r][nb.c] === EMPTY){
                        region[nb.r][nb.c] = color;
                        queue.push({ r: nb.r, c: nb.c, color: color });
                    }
                }
            }
            head = batchEnd;
        }
        return region;
    }

    function tracePath(region, color, size){
        const cells = [];
        for (let r = 0; r < size; r++){
            for (let c = 0; c < size; c++){
                if (region[r][c] === color) cells.push({ r: r, c: c });
            }
        }

        if (cells.length === 0) return null;
        if (cells.length === 1) return [cells[0]];
        if (cells.length === 2){
            const a = cells[0];
            const b = cells[1];
            return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1 ? [a, b] : null;
        }

        function inRegion(r, c){
            return r >= 0 && r < size && c >= 0 && c < size && region[r][c] === color;
        }

        function key(r, c){
            return r * size + c;
        }

        function degree(r, c, visited){
            const nbs = getNeighbors(r, c, size);
            let count = 0;
            for (let i = 0; i < nbs.length; i++){
                if (inRegion(nbs[i].r, nbs[i].c) && !visited.has(key(nbs[i].r, nbs[i].c))){
                    count++;
                }
            }
            return count;
        }

        const total = cells.length;

        // Exhaustive DFS for tiny regions (≤ 6 cells)
        if (total <= 6){
            const startCandidates = shuffle([...cells]);
            for (let s = 0; s < startCandidates.length; s++){
                const start   = startCandidates[s];
                const visited = new Set();
                visited.add(key(start.r, start.c));
                const path = [start];

                function dfs(cur){
                    if (path.length === total) return true;
                    const nbs = shuffle(getNeighbors(cur.r, cur.c, size));
                    const candidates = [];
                    for (let i = 0; i < nbs.length; i++){
                        if (inRegion(nbs[i].r, nbs[i].c) && !visited.has(key(nbs[i].r, nbs[i].c))){
                            candidates.push(nbs[i]);
                        }
                    }
                    for (let i = 0; i < candidates.length; i++){
                        const nb = candidates[i];
                        visited.add(key(nb.r, nb.c));
                        path.push(nb);
                        if (dfs(nb)) return true;
                        path.pop();
                        visited.delete(key(nb.r, nb.c));
                    }
                    return false;
                }

                if (dfs(start)) return path;
            }
            return null;
        }

        // Warnsdorff's heuristic for larger regions
        const startCandidates = shuffle([...cells]).slice(0, Math.min(12, cells.length));
        for (let s = 0; s < startCandidates.length; s++){
            const start   = startCandidates[s];
            const visited = new Set();
            visited.add(key(start.r, start.c));
            const path = [start];
            let cur    = start;
            let ok     = true;

            while (path.length < total){
                const allNbs = getNeighbors(cur.r, cur.c, size);
                const nbs    = [];
                for (let i = 0; i < allNbs.length; i++){
                    const nb = allNbs[i];
                    if (inRegion(nb.r, nb.c) && !visited.has(key(nb.r, nb.c))){
                        nbs.push(nb);
                    }
                }
                if (nbs.length === 0){ ok = false; break; }

                nbs.sort(function(a, b){
                    const da = degree(a.r, a.c, visited);
                    const db = degree(b.r, b.c, visited);
                    return da !== db ? da - db : Math.random() - 0.5;
                });

                const pick = nbs.length > 1 && Math.random() < 0.15 ? nbs[1] : nbs[0];
                path.push(pick);
                visited.add(key(pick.r, pick.c));
                cur = pick;
            }

            if (ok && path.length === total) return path;
        }
        return null;
    }
    
 
    // ─── generateFlowGrid ─────────────────────────────────────────
    // Returns the 2D solution array directly:
    //   solution[r][c] = color index (0-based integer)
    //
    // Also returns endpoints so you know where the dots go:
    //   endpoints[i] = { color, start: {r,c}, end: {r,c}, path: [{r,c},...] }
    //
    // Usage:
    //   const { solution, endpoints } = generateFlowGrid(5, 4);
    //   solution[2][3]  // → color index at row 2, col 3
    //   test.grid = solution; // assign directly to your Grid
 
    function generateFlowGrid(size, numColors, maxRetries){
        if (maxRetries === undefined) maxRetries = 60;

        for (let attempt = 0; attempt < maxRetries; attempt++){
            const region = partitionGrid(size, numColors);

            // Reject partitions where any region has fewer than 2 cells
            const counts = [];
            for (let i = 0; i < numColors; i++){
                counts.push(0);
            }
            for (let r = 0; r < size; r++){
                for (let c = 0; c < size; c++){
                    counts[region[r][c]]++;
                }
            }

            let tooSmall = false;
            for (let i = 0; i < counts.length; i++){
                if (counts[i] < 2){
                    tooSmall = true;
                    break;
                }
            }
            if (tooSmall) continue;

            // Trace a path through every cell in each color's region
            const endpoints = [];
            let allOk = true;

            for (let col = 0; col < numColors; col++){
                const path = tracePath(region, col, size);
                if (!path){ allOk = false; break; }
                endpoints.push({
                    color: col,
                    start: path[0],
                    end:   path[path.length - 1],
                    path:  path,
                });
            }

            if (!allOk) continue;

            return { solution: region, endpoints: endpoints };
        }
        return null;
    }
    const canvas = this.document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    let isDragging = false;

    const grid = new Grid("easy", canvas.width, canvas.height);

    // Start dragging
    canvas.addEventListener("pointerdown", function() {
        isDragging = true;

        const pos = getCanvasPos(e);
        console.log("Start:", pos);
    });

    // Dragging movement
    canvas.addEventListener("pointermove", function() {
        if (!isDragging) return;

        const pos = getCanvasPos(e);
        console.log("Dragging at:", pos);
    });

    // Stop dragging
    canvas.addEventListener("pointerup", function() {
        isDragging = false;
        console.log("Drag ended");
    });

    // Optional: if mouse leaves canvas
    canvas.addEventListener("pointerleave", function() {
        isDragging = false;
    });

    

    function animate(){
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "black"; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        grid.drawGrid(ctx);
        grid.drawEndpoints(ctx);

        requestAnimationFrame(animate);
    }
    animate();
});