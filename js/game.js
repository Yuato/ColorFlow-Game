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
            this.cellSize = (this.frameMin - 20) / this.size;

            this.solutionGrid = generateFlowGrid(this.size, 4);

            this.userEndpoints = [];
            for (let i = 0; i < this.solutionGrid.endpoints.length; i++){
                this.userEndpoints.push({
                    color: this.solutionGrid.endpoints[i].color,
                    start: this.solutionGrid.endpoints[i].start,
                    end:   this.solutionGrid.endpoints[i].end,
                });
            }

            this.userGrid  = makeGrid(this.size);
            this.userPaths = [];
            for (let i = 0; i < this.solutionGrid.endpoints.length; i++){
                this.userPaths.push([]);
            }

            // active drawing state
            this.activeColor = null;   // color index currently being drawn
        }

        // Convert a canvas pixel position to a grid {r, c}
        // Returns null if the position is outside the grid
        getCellFromPos(px, py){
            const col = Math.floor((px - this.x) / this.cellSize);
            const row = Math.floor((py - this.y) / this.cellSize);
            if (row < 0 || row >= this.size || col < 0 || col >= this.size) return null;
            return { r: row, c: col };
        }

        // Returns the color index if {r,c} is a dot, otherwise null
        getDotColor(r, c){
            for (let i = 0; i < this.userEndpoints.length; i++){
                const ep = this.userEndpoints[i];
                if ((ep.start.r === r && ep.start.c === c) ||
                    (ep.end.r   === r && ep.end.c   === c)){
                    return ep.color;
                }
            }
            return null;
        }

        // Check if {r,c} is adjacent to the last cell in the active path
        isAdjacent(r, c){
            const path = this.userPaths[this.activeColor];
            if (path.length === 0) return false;
            const last = path[path.length - 1];
            return Math.abs(last.r - r) + Math.abs(last.c - c) === 1;
        }

        // Check if {r,c} is the second-to-last cell — user is backtracking
        isBacktrack(r, c){
            const path = this.userPaths[this.activeColor];
            if (path.length < 2) return false;
            const prev = path[path.length - 2];
            return prev.r === r && prev.c === c;
        }

        // Clear ownership and path for one color
        clearColor(color){
            for (let r = 0; r < this.size; r++){
                for (let c = 0; c < this.size; c++){
                    if (this.userGrid[r][c] === color){
                        this.userGrid[r][c] = EMPTY;
                    }
                }
            }
            this.userPaths[color] = [];
        }

        // Called when the user presses down on the canvas
        onPointerDown(px, py){
            const cell = this.getCellFromPos(px, py);
            if (!cell) return;

            const dotColor = this.getDotColor(cell.r, cell.c);

            // must start on a dot
            if (dotColor === null) return;

            // check if there is already a partial path for this color
            // if so, check if the user clicked the end of it to resume
            const existingPath = this.userPaths[dotColor];
            if (existingPath.length > 0){
                const tail = existingPath[existingPath.length - 1];
                // clicked the tip of an existing path — resume from there
                if (tail.r === cell.r && tail.c === cell.c){
                    this.activeColor = dotColor;
                    return;
                }
                // clicked the start of an existing path — resume from there
                // reverse the path so the clicked end becomes the tip
                const head = existingPath[0];
                if (head.r === cell.r && head.c === cell.c){
                    this.userPaths[dotColor].reverse();
                    this.activeColor = dotColor;
                    return;
                }
            }

            // otherwise start fresh from this dot
            this.clearColor(dotColor);
            this.activeColor = dotColor;
            this.userGrid[cell.r][cell.c] = dotColor;
            this.userPaths[dotColor].push({ r: cell.r, c: cell.c });
        }

        // Called as the user drags across the canvas
        onPointerMove(px, py){
            if (this.activeColor === null) return;

            const cell = this.getCellFromPos(px, py);
            if (!cell) return;

            const path = this.userPaths[this.activeColor];
            const last = path[path.length - 1];

            // already on this cell
            if (last.r === cell.r && last.c === cell.c) return;

            // backtracking — remove the last cell
            if (this.isBacktrack(cell.r, cell.c)){
                this.userGrid[last.r][last.c] = EMPTY;
                path.pop();
                return;
            }

            // must be adjacent to continue
            if (!this.isAdjacent(cell.r, cell.c)) return;

            // if another color owns this cell, clear it
            const existing = this.userGrid[cell.r][cell.c];
            if (existing !== EMPTY && existing !== this.activeColor){
                this.clearColor(existing);
            }

            // stop drawing if we hit the other endpoint of this color
            const dotColor = this.getDotColor(cell.r, cell.c);
            this.userGrid[cell.r][cell.c] = this.activeColor;
            path.push({ r: cell.r, c: cell.c });

            if (dotColor === this.activeColor){
                this.activeColor = null;  // path is complete
            }
        }

        // Called when the user lifts the pointer — pause, not clear
        onPointerUp(){
            this.activeColor = null;
        }

        drawGrid(ctx){
            ctx.strokeStyle = "white";
            ctx.lineWidth = this.strokeLength;
            let length = this.frameMin - 20;

            ctx.strokeRect(this.x, this.y, length, length);

            let size = 0;
            if (this.difficulty == "easy") size = 5;

            for (let i = 1; i < size; i++){
                ctx.beginPath();
                ctx.moveTo(this.x + i * length / 5, this.y);
                ctx.lineTo(this.x + i * length / 5, this.y + length);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(this.x, this.y + i * length / 5);
                ctx.lineTo(this.x + length, this.y + i * length / 5);
                ctx.stroke();
            }
        }

        drawUserPaths(ctx){
            for (let i = 0; i < this.userPaths.length; i++){
                const path = this.userPaths[i];
                if (path.length < 2) continue;

                ctx.beginPath();
                ctx.strokeStyle = this.colors[i];
                ctx.lineWidth   = this.cellSize * 0.4;
                ctx.lineCap     = 'round';
                ctx.lineJoin    = 'round';

                ctx.moveTo(
                    this.x + path[0].c * this.cellSize + this.cellSize / 2,
                    this.y + path[0].r * this.cellSize + this.cellSize / 2
                );

                for (let j = 1; j < path.length; j++){
                    ctx.lineTo(
                        this.x + path[j].c * this.cellSize + this.cellSize / 2,
                        this.y + path[j].r * this.cellSize + this.cellSize / 2
                    );
                }

                ctx.stroke();
            }
        }

        drawEndpoints(ctx){
            for (let i = 0; i < this.userEndpoints.length; i++){
                const color = this.colors[this.userEndpoints[i].color];

                // start dot — note: c maps to x, r maps to y
                const sx = this.x + (this.userEndpoints[i].start.c + 0.5) * this.cellSize;
                const sy = this.y + (this.userEndpoints[i].start.r + 0.5) * this.cellSize;
                ctx.beginPath();
                ctx.arc(sx, sy, this.cellSize / 3, 0, Math.PI * 2);
                ctx.fillStyle   = color;
                ctx.strokeStyle = color;
                ctx.fill();
                ctx.stroke();

                // end dot
                const ex = this.x + (this.userEndpoints[i].end.c + 0.5) * this.cellSize;
                const ey = this.y + (this.userEndpoints[i].end.r + 0.5) * this.cellSize;
                ctx.beginPath();
                ctx.arc(ex, ey, this.cellSize / 3, 0, Math.PI * 2);
                ctx.fillStyle   = color;
                ctx.strokeStyle = color;
                ctx.fill();
                ctx.stroke();
            }
        }
    }

    // ── Generator functions (unchanged) ──────────────────────────

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
        function key(r, c){ return r * size + c; }
        function degree(r, c, visited){
            const nbs = getNeighbors(r, c, size);
            let count = 0;
            for (let i = 0; i < nbs.length; i++){
                if (inRegion(nbs[i].r, nbs[i].c) && !visited.has(key(nbs[i].r, nbs[i].c))) count++;
            }
            return count;
        }
        const total = cells.length;
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
                    if (inRegion(nb.r, nb.c) && !visited.has(key(nb.r, nb.c))) nbs.push(nb);
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

    function generateFlowGrid(size, numColors, maxRetries){
        if (maxRetries === undefined) maxRetries = 60;
        for (let attempt = 0; attempt < maxRetries; attempt++){
            const region = partitionGrid(size, numColors);
            const counts = [];
            for (let i = 0; i < numColors; i++) counts.push(0);
            for (let r = 0; r < size; r++)
                for (let c = 0; c < size; c++)
                    counts[region[r][c]]++;
            let tooSmall = false;
            for (let i = 0; i < counts.length; i++){
                if (counts[i] < 2){ tooSmall = true; break; }
            }
            if (tooSmall) continue;
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

    // ── Canvas setup ─────────────────────────────────────────────

    const canvas = document.getElementById("canvas");
    const ctx    = canvas.getContext("2d");
    canvas.width  = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const grid = new Grid("easy", canvas.width, canvas.height);

    function getCanvasPos(e){
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    }

    canvas.addEventListener("pointerdown", function(e){
        const pos = getCanvasPos(e);
        grid.onPointerDown(pos.x, pos.y);
    });

    canvas.addEventListener("pointermove", function(e){
        const pos = getCanvasPos(e);
        grid.onPointerMove(pos.x, pos.y);
    });

    canvas.addEventListener("pointerup", function(e){
        grid.onPointerUp();
    });

    canvas.addEventListener("pointerleave", function(e){
        grid.onPointerUp();
    });

    function animate(){
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        grid.drawGrid(ctx);
        grid.drawUserPaths(ctx);
        grid.drawEndpoints(ctx);
        requestAnimationFrame(animate);
    }
    animate();
});