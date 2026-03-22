/**
* Tony Yuan
* March 12 2026
* Javascript file that generates the game grid, displays the grid, and buttons controlling
  difficulty, button to display solution, and links to other pages.
**/
window.addEventListener("load", function(){
    const EMPTY = null;
    const DIRS  = [{ r: -1, c: 0 }, { r: 1, c: 0 }, { r: 0, c: -1 }, { r: 0, c: 1 }];

    /**
     * Reads and returns the win counts stored in localStorage
     *
     * @returns {{ easy: Number, medium: Number, hard: Number }}
     */
    function loadStats(){
        const raw = localStorage.getItem("flowfree_stats");
        if (raw) return JSON.parse(raw);
        return { easy: 0, medium: 0, hard: 0 };
    }

    /**
     * Writes the stats object to localStorage
     *
     * @param {{ easy: Number, medium: Number, hard: Number }} stats
     */
    function saveStats(stats){
        localStorage.setItem("flowfree_stats", JSON.stringify(stats));
    }

    /**
     * Increments the win count for the given difficulty and saves it
     *
     * @param {String} difficulty - "easy" | "medium" | "hard"
     */
    function incrementStat(difficulty){
        const stats = loadStats();
        stats[difficulty]++;
        saveStats(stats);
    }

    class Grid{

        /**
         * Initialises canvas dimensions, computes grid frame size, and generates the first puzzle
         *
         * @param {String} difficulty - "easy" | "medium" | "hard"
         * @param {Number} width - canvas width in pixels
         * @param {Number} height - canvas height in pixels
         */
        constructor(difficulty, width, height){
            this.width  = width;
            this.height = height;
            this.colors = ['purple', 'teal', 'orange', 'coral', 'red', 'blue', 'green', 'maroon'];

            const buttonArea   = 80;
            const topBarHeight = 48;
            const usableHeight = height - buttonArea - topBarHeight;

            this.frameMin     = Math.min(width, usableHeight) - 20;
            this.strokeLength = this.frameMin / 100;

            this.activeColor     = null;
            this.isDragging      = false;
            this.showingSolution = false;

            this.setDifficulty(difficulty);
        }

        /**
         * Resets all game state and generates a fresh puzzle for the given difficulty
         *
         * @param {String} difficulty - "easy" | "medium" | "hard"
         */
        setDifficulty(difficulty){
            this.difficulty      = difficulty;
            this.showingSolution = false;
            this.activeColor     = null;
            this.isDragging      = false;

            if (difficulty === "easy"){
                this.size      = 5;
                this.numColors = 4;
            } else if (difficulty === "medium"){
                this.size      = 7;
                this.numColors = 6;
            } else if (difficulty === "hard"){
                this.size      = 9;
                this.numColors = 8;
            }

            this.cellSize = this.frameMin / this.size;

            const topBarHeight = 48;
            const buttonArea   = 80;
            const usableHeight = this.height - buttonArea - topBarHeight;

            this.x = (this.width - this.frameMin) / 2;
            this.y = topBarHeight + (usableHeight - this.frameMin) / 2;

            this.solutionGrid = generateFlowGrid(this.size, this.numColors);

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
            for (let i = 0; i < this.numColors; i++){
                this.userPaths.push([]);
            }
        }

        /**
         * Converts a canvas pixel position to a grid cell coordinate
         *
         * @param {Number} px - x position in canvas pixels
         * @param {Number} py - y position in canvas pixels
         * @returns {{ r: Number, c: Number } | null} cell coordinate or null if out of bounds
         */
        getCellFromPos(px, py){
            const col = Math.floor((px - this.x) / this.cellSize);
            const row = Math.floor((py - this.y) / this.cellSize);
            if (row < 0 || row >= this.size || col < 0 || col >= this.size) return null;
            return { r: row, c: col };
        }

        /**
         * Returns the color index if the cell is a dot endpoint, otherwise null
         *
         * @param {Number} r - row index
         * @param {Number} c - column index
         * @returns {Number | null} color index or null
         */
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

        /**
         * Returns true if the cell is directly adjacent to the last cell of the active path
         *
         * @param {Number} r - row index
         * @param {Number} c - column index
         * @returns {Boolean}
         */
        isAdjacent(r, c){
            const path = this.userPaths[this.activeColor];
            if (path.length === 0) return false;
            const last = path[path.length - 1];
            return Math.abs(last.r - r) + Math.abs(last.c - c) === 1;
        }

        /**
         * Returns true if the cell matches the second-to-last cell in the active path
         *
         * @param {Number} r - row index
         * @param {Number} c - column index
         * @returns {Boolean}
         */
        isBacktrack(r, c){
            const path = this.userPaths[this.activeColor];
            if (path.length < 2) return false;
            const prev = path[path.length - 2];
            return prev.r === r && prev.c === c;
        }

        /**
         * Wipes all cells owned by the given color from userGrid and empties its path array
         *
         * @param {Number} color - color index to clear
         */
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

        /**
         * Handles press — starts a new path from a dot or resumes an existing path from any cell
         *
         * @param {Number} px - x position in canvas pixels
         * @param {Number} py - y position in canvas pixels
         */
        onPointerDown(px, py){
            if (this.showingSolution) return;

            const cell = this.getCellFromPos(px, py);
            if (!cell) return;

            const dotColor  = this.getDotColor(cell.r, cell.c);
            const cellColor = this.userGrid[cell.r][cell.c];

            if (dotColor !== null){
                this.clearColor(dotColor);
                this.activeColor = dotColor;
                this.isDragging  = true;
                this.userGrid[cell.r][cell.c] = dotColor;
                this.userPaths[dotColor].push({ r: cell.r, c: cell.c });
                return;
            }

            if (cellColor !== null){
                const path = this.userPaths[cellColor];

                let clickedIndex = -1;
                for (let i = 0; i < path.length; i++){
                    if (path[i].r === cell.r && path[i].c === cell.c){
                        clickedIndex = i;
                        break;
                    }
                }

                if (clickedIndex === -1) return;

                for (let i = clickedIndex + 1; i < path.length; i++){
                    this.userGrid[path[i].r][path[i].c] = EMPTY;
                }
                this.userPaths[cellColor] = path.slice(0, clickedIndex + 1);

                this.activeColor = cellColor;
                this.isDragging  = true;
            }
        }

        /**
         * Handles drag — extends or backtracks the active path, blocks loops and foreign endpoints
         *
         * @param {Number} px - x position in canvas pixels
         * @param {Number} py - y position in canvas pixels
         */
        onPointerMove(px, py){
            if (!this.isDragging || this.activeColor === null) return;
            if (this.showingSolution) return;

            const cell = this.getCellFromPos(px, py);
            if (!cell) return;

            const path = this.userPaths[this.activeColor];
            const last = path[path.length - 1];

            if (last.r === cell.r && last.c === cell.c) return;

            if (this.isBacktrack(cell.r, cell.c)){
                this.userGrid[last.r][last.c] = EMPTY;
                path.pop();
                return;
            }

            if (!this.isAdjacent(cell.r, cell.c)) return;

            const activePath = this.userPaths[this.activeColor];
            for (let i = 0; i < activePath.length; i++){
                if (activePath[i].r === cell.r && activePath[i].c === cell.c) return;
            }

            const epColor = this.getDotColor(cell.r, cell.c);
            if (epColor !== null && epColor !== this.activeColor) return;

            const existing = this.userGrid[cell.r][cell.c];
            if (existing !== EMPTY && existing !== this.activeColor){
                this.clearColor(existing);
            }

            this.userGrid[cell.r][cell.c] = this.activeColor;
            path.push({ r: cell.r, c: cell.c });

            const dotColor = this.getDotColor(cell.r, cell.c);
            if (dotColor === this.activeColor){
                this.activeColor = null;
                this.isDragging  = false;

                if (this.checkWin()){
                    incrementStat(this.difficulty);
                    sessionStorage.setItem("result_difficulty", this.difficulty);
                    window.location.replace("stats.html");
                }
            }
        }

        /**
         * Stops the active drag and clears the active color on pointer release
         */
        onPointerUp(){
            this.isDragging  = false;
            this.activeColor = null;
        }

        /**
         * Returns true if every cell is filled and every path connects its two endpoints
         *
         * @returns {Boolean}
         */
        checkWin(){
            // count total cells covered by all user paths
            let covered = 0;
            for (let i = 0; i < this.userPaths.length; i++){
                covered += this.userPaths[i].length;
            }
            if (covered !== this.size * this.size) return false;

            // every path must connect its two endpoints end-to-end
            for (let i = 0; i < this.userPaths.length; i++){
                const path = this.userPaths[i];
                const ep   = this.solutionGrid.endpoints[i];
                if (path.length < 2) return false;
                const head = path[0];
                const tail = path[path.length - 1];
                const forwardOk =
                    head.r === ep.start.r && head.c === ep.start.c &&
                    tail.r === ep.end.r   && tail.c === ep.end.c;
                const reverseOk =
                    head.r === ep.end.r   && head.c === ep.end.c   &&
                    tail.r === ep.start.r && tail.c === ep.start.c;
                if (!forwardOk && !reverseOk) return false;
            }
            return true;
        }

        /**
         * Flags showingSolution so drawUserPaths renders the solution and blocks all input
         */
        showSolution(){
            this.showingSolution = true;
            this.isDragging      = false;
            this.activeColor     = null;
        }

        /**
         * Draws the grid border and inner cell lines onto the canvas
         *
         * @param {CanvasRenderingContext2D} ctx
         */
        drawGrid(ctx){
            ctx.strokeStyle = "white";
            ctx.lineWidth   = this.strokeLength;

            ctx.strokeRect(this.x, this.y, this.frameMin, this.frameMin);

            for (let i = 1; i < this.size; i++){
                ctx.beginPath();
                ctx.moveTo(this.x + i * this.cellSize, this.y);
                ctx.lineTo(this.x + i * this.cellSize, this.y + this.frameMin);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(this.x, this.y + i * this.cellSize);
                ctx.lineTo(this.x + this.frameMin, this.y + i * this.cellSize);
                ctx.stroke();
            }
        }

        /**
         * Draws the user's current paths, or the solution paths if showingSolution is true
         *
         * @param {CanvasRenderingContext2D} ctx
         */
        drawUserPaths(ctx){
            if (this.showingSolution){
                const endpoints = this.solutionGrid.endpoints;
                for (let i = 0; i < endpoints.length; i++){
                    const path = endpoints[i].path;
                    if (path.length < 2) continue;

                    ctx.beginPath();
                    ctx.strokeStyle = this.colors[endpoints[i].color];
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
                return;
            }

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

        /**
         * Draws a filled circle for every start and end dot on the grid
         *
         * @param {CanvasRenderingContext2D} ctx
         */
        drawEndpoints(ctx){
            ctx.save();
            ctx.lineWidth = 2;

            for (let i = 0; i < this.userEndpoints.length; i++){
                const color = this.colors[this.userEndpoints[i].color];

                const sx = this.x + (this.userEndpoints[i].start.c + 0.5) * this.cellSize;
                const sy = this.y + (this.userEndpoints[i].start.r + 0.5) * this.cellSize;
                ctx.beginPath();
                ctx.arc(sx, sy, this.cellSize / 3, 0, Math.PI * 2);
                ctx.fillStyle   = color;
                ctx.strokeStyle = color;
                ctx.fill();
                ctx.stroke();

                const ex = this.x + (this.userEndpoints[i].end.c + 0.5) * this.cellSize;
                const ey = this.y + (this.userEndpoints[i].end.r + 0.5) * this.cellSize;
                ctx.beginPath();
                ctx.arc(ex, ey, this.cellSize / 3, 0, Math.PI * 2);
                ctx.fillStyle   = color;
                ctx.strokeStyle = color;
                ctx.fill();
                ctx.stroke();
            }

            ctx.restore();
        }
    }

    /**
     * Creates and returns a size×size grid filled with EMPTY (null)
     *
     * @param {Number} size - grid dimension
     * @returns {Array<Array<null>>} 2D array filled with null
     */
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

    /**
     * Shuffles an array in place using Fisher-Yates and returns it
     *
     * @param {Array} arr - array to shuffle
     * @returns {Array} the same array, shuffled
     */
    function shuffle(arr){
        for (let i = arr.length - 1; i > 0; i--){
            const j    = Math.floor(Math.random() * (i + 1));
            const temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
        }
        return arr;
    }

    /**
     * Returns all valid grid cells directly adjacent (up/down/left/right) to the given cell
     *
     * @param {Number} r - row index
     * @param {Number} c - column index
     * @param {Number} size - grid dimension
     * @returns {Array<{ r: Number, c: Number }>} array of adjacent cell coordinates
     */
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

    /**
     * Assigns every cell to a color territory via randomised multi-source BFS (Voronoi partition)
     *
     * @param {Number} size - grid dimension
     * @param {Number} numColors - number of color regions to create
     * @returns {Array<Array<Number>>} 2D array where each cell holds a color index
     */
    function partitionGrid(size, numColors){
        const region   = makeGrid(size);
        const queue    = [];
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

    /**
     * Traces a Hamiltonian path through all cells of one color region using DFS or Warnsdorff's heuristic
     *
     * @param {Array<Array<Number>>} region - 2D array of color indices
     * @param {Number} color - color index to trace
     * @param {Number} size - grid dimension
     * @returns {Array<{ r: Number, c: Number }> | null} ordered path of cells or null if failed
     */
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
                    const nbs        = shuffle(getNeighbors(cur.r, cur.c, size));
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

    /**
     * Generates a complete Flow Free puzzle by partitioning the grid and tracing a path per color
     *
     * @param {Number} size - grid dimension
     * @param {Number} numColors - number of color pairs
     * @param {Number} maxRetries - maximum generation attempts before returning null
     * @returns {{ solution: Array<Array<Number>>, endpoints: Array<Object> } | null}
     */
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

    /**
     * Extracts the canvas-relative pixel position from a mouse or touch event
     *
     * @param {Event} e - pointer or touch event
     * @returns {{ x: Number, y: Number }}
     */
    function getCanvasPos(e){
        const rect    = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top,
        };
    }

    /**
     * Removes the active class from all difficulty buttons and adds it to the specified button
     *
     * @param {String} activeId - element id of the button to mark active
     */
    function setActiveButton(activeId){
        document.getElementById("btn-easy").classList.remove("active");
        document.getElementById("btn-medium").classList.remove("active");
        document.getElementById("btn-hard").classList.remove("active");
        document.getElementById(activeId).classList.add("active");
    }

    /**
     * Clears the canvas, fills the background, and draws the grid, paths, and endpoints each frame
     */
    function animate(){
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#111";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        grid.drawGrid(ctx);
        grid.drawUserPaths(ctx);
        grid.drawEndpoints(ctx);
        requestAnimationFrame(animate);
    }

    const canvas = document.getElementById("canvas");
    const ctx    = canvas.getContext("2d");
    canvas.width  = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    var startDifficulty = "easy";
    var params = new URLSearchParams(window.location.search);
    if (params.get("difficulty")){
        startDifficulty = params.get("difficulty");
    }

    const grid = new Grid(startDifficulty, canvas.width, canvas.height);

    var btnMap = { easy: "btn-easy", medium: "btn-medium", hard: "btn-hard" };
    setActiveButton(btnMap[startDifficulty]);

    canvas.addEventListener("pointerdown", function(e){
        e.preventDefault();
        const pos = getCanvasPos(e);
        grid.onPointerDown(pos.x, pos.y);
    });

    canvas.addEventListener("pointermove", function(e){
        e.preventDefault();
        const pos = getCanvasPos(e);
        grid.onPointerMove(pos.x, pos.y);
    });

    canvas.addEventListener("pointerup", function(e){
        e.preventDefault();
        grid.onPointerUp();
    });

    canvas.addEventListener("pointerleave", function(e){
        grid.onPointerUp();
    });

    canvas.addEventListener("touchstart", function(e){
        e.preventDefault();
        const pos = getCanvasPos(e);
        grid.onPointerDown(pos.x, pos.y);
    }, { passive: false });

    canvas.addEventListener("touchmove", function(e){
        e.preventDefault();
        const pos = getCanvasPos(e);
        grid.onPointerMove(pos.x, pos.y);
    }, { passive: false });

    canvas.addEventListener("touchend", function(e){
        e.preventDefault();
        grid.onPointerUp();
    }, { passive: false });

    document.getElementById("btn-easy").addEventListener("click", function(){
        grid.setDifficulty("easy");
        setActiveButton("btn-easy");
    });

    document.getElementById("btn-medium").addEventListener("click", function(){
        grid.setDifficulty("medium");
        setActiveButton("btn-medium");
    });

    document.getElementById("btn-hard").addEventListener("click", function(){
        grid.setDifficulty("hard");
        setActiveButton("btn-hard");
    });

    document.getElementById("btn-solution").addEventListener("click", function(){
        grid.showSolution();
    });

    window.addEventListener("resize", function(){
        canvas.width  = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        grid.width    = canvas.width;
        grid.height   = canvas.height;

        const topBarHeight = 48;
        const buttonArea   = 80;
        const usableHeight = canvas.height - buttonArea - topBarHeight;
        grid.frameMin     = Math.min(canvas.width, usableHeight) - 20;
        grid.strokeLength = grid.frameMin / 100;

        grid.setDifficulty(grid.difficulty);
    });

    animate();
});