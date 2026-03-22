/**
* Tony Yuan
* March 9 2026
* Javascript file that retrieves user's localstorage statistics and displays them
**/
window.addEventListener("load", function(){

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
     * Reads stats from localStorage and updates all stat display elements in the DOM
     */
    function renderStats(){
        const stats = loadStats();
        document.getElementById("s-easy").textContent   = stats.easy;
        document.getElementById("s-medium").textContent = stats.medium;
        document.getElementById("s-hard").textContent   = stats.hard;
        document.getElementById("s-total").textContent  = stats.easy + stats.medium + stats.hard;
    }

    renderStats();
});