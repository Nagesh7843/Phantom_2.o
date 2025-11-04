document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.dev-os-container');
    if (!container) return;

    const icons = [
        { top: '20px', left: 'calc(50% - 30px)', transform: 'translateY(-100px) scale(0.5)', opacity: '0' },
        { top: 'calc(50% - 30px)', left: 'calc(100% + 30px)', transform: 'translateX(100px) scale(0.5)', opacity: '0' },
        { top: 'calc(100% + 30px)', left: 'calc(50% - 30px)', transform: 'translateY(100px) scale(0.5)', opacity: '0' },
        { top: 'calc(50% - 30px)', left: '-100px', transform: 'translateX(-100px) scale(0.5)', opacity: '0' }
    ];

    const components = document.querySelectorAll('.dev-os-component');

    setTimeout(() => {
        components.forEach((comp, index) => {
            const finalState = icons[index];
            comp.style.transform = `translate(calc(50vw - 50% - 20px), calc(175px - 50%)) scale(0.1)`;
            comp.style.opacity = '0';
        });
    }, 1000);

    // This is a simplified visual effect. A real implementation might use a library.
    // The CSS animations provide the floating effect. This JS part simulates them being "pulled in".
    // For a more robust effect, you'd calculate the exact center of the core element.
});
