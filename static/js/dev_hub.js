document.addEventListener('DOMContentLoaded', () => {
    const todoCol = document.getElementById('kanban-todo');
    const inProgressCol = document.getElementById('kanban-inprogress');
    const doneCol = document.getElementById('kanban-done');

    if (!todoCol || !inProgressCol || !doneCol) return;

    const tasks = [
        { id: 'task1', el: document.getElementById('task1'), from: todoCol, to: inProgressCol, delay: 1000 },
        { id: 'task2', el: document.getElementById('task2'), from: todoCol, to: inProgressCol, delay: 2500 },
        { id: 'task1', el: document.getElementById('task1'), from: inProgressCol, to: doneCol, delay: 4000 },
    ];

    // Initially make all cards visible
    document.querySelectorAll('.kanban-card').forEach(card => {
        setTimeout(() => card.classList.add('visible'), 100);
    });

    tasks.forEach(task => {
        setTimeout(() => {
            // Animate out
            task.el.style.opacity = '0';
            
            setTimeout(() => {
                // Move element in the DOM
                task.from.removeChild(task.el);
                task.to.appendChild(task.el);
                
                // Animate in
                task.el.style.opacity = '1';
            }, 500); // Wait for fade out to complete

        }, task.delay);
    });
});
