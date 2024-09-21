document.addEventListener('DOMContentLoaded', () => {
    const buyButton = document.getElementById('buy-button');
    const purchaseForm = document.getElementById('purchase-form');

    buyButton.addEventListener('click', () => {
        purchaseForm.style.display = 'block';
        purchaseForm.scrollIntoView({ behavior: 'smooth' });
    });
});
