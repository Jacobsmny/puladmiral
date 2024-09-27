// Проверка, что Firebase загружен
if (typeof firebase === 'undefined') {
    console.error("Firebase SDK не загружен.");
} else {
    console.log("Firebase SDK успешно загружен.");
}

let orders = [];

// Функция для получения всех заказов из Firestore
function fetchOrders() {
    db.collection('orders').get()
        .then((querySnapshot) => {
            orders = [];
            querySnapshot.forEach((doc) => {
                const order = doc.data();
                order.id = doc.id;
                // Преобразование Timestamp в Date
                order.deadline = order.deadline.toDate();
                orders.push(order);
            });
            renderOrders();
        })
        .catch((error) => {
            console.error("Ошибка при получении заказов: ", error);
        });
}

// Функция для добавления нового заказа в Firestore
function addOrder(order) {
    db.collection('orders').add(order)
        .then((docRef) => {
            order.id = docRef.id;
            orders.push(order);
            renderOrders();
        })
        .catch((error) => {
            console.error("Ошибка при добавлении заказа: ", error);
        });
}

// Функция для удаления заказа из Firestore
function deleteOrder(id) {
    if (confirm('Вы уверены, что хотите удалить этот заказ?')) {
        db.collection('orders').doc(id).delete()
            .then(() => {
                orders = orders.filter(order => order.id !== id);
                renderOrders();
            })
            .catch((error) => {
                console.error("Ошибка при удалении заказа: ", error);
            });
    }
}

// Функция для обновления заказа в Firestore (например, смена статуса)
function updateOrder(id, updatedData) {
    db.collection('orders').doc(id).update(updatedData)
        .then(() => {
            const index = orders.findIndex(order => order.id === id);
            if (index !== -1) {
                orders[index] = { ...orders[index], ...updatedData };
                renderOrders();
            }
        })
        .catch((error) => {
            console.error("Ошибка при обновлении заказа: ", error);
        });
}

// Обработка отправки формы нового заказа
document.getElementById('newOrderForm').onsubmit = function(event) {
    event.preventDefault(); // Предотвращаем перезагрузку страницы

    const totalAmount = parseFloat(document.getElementById('totalAmount').value);
    const depositAmount = parseFloat(document.getElementById('depositAmount').value);

    // Проверка, чтобы залог не превышал общую сумму
    if (depositAmount > totalAmount) {
        alert('Залог не может превышать общую сумму заказа.');
        return;
    }

    const depositPercentage = ((depositAmount / totalAmount) * 100).toFixed(2);
    const outstandingAmount = totalAmount - depositAmount;

    const deadlineInput = document.getElementById('deadline').value;
    const deadlineDate = new Date(deadlineInput);
    const deadlineTimestamp = firebase.firestore.Timestamp.fromDate(deadlineDate);

    const order = {
        name: document.getElementById('name').value,
        phone: document.getElementById('phone').value,
        size: document.getElementById('size').value,
        quantity: parseInt(document.getElementById('quantity').value),
        company: document.getElementById('company').value,
        note: document.getElementById('note').value,
        deadline: deadlineTimestamp,
        status: 'waiting', // Статус по умолчанию "ожидание"
        paymentType: document.getElementById('paymentType').value,
        totalAmount: totalAmount,
        depositAmount: depositAmount,
        depositPercentage: parseFloat(depositPercentage),
        outstandingAmount: outstandingAmount
    };

    addOrder(order);
    closeFormModal();
};

// Функция для отображения всех заказов на странице
function renderOrders() {
    const waitingContainer = document.getElementById('waiting-orders');
    const completedContainer = document.getElementById('completed-orders');
    waitingContainer.innerHTML = '';
    completedContainer.innerHTML = '';

    orders.forEach(order => {
        const orderDiv = document.createElement('div');
        orderDiv.classList.add('order');
        orderDiv.innerText = `${order.company} - ${order.name}`;

        // Кнопка удаления заказа
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = 'X';
        deleteBtn.onclick = function(event) {
            event.stopPropagation();
            deleteOrder(order.id);
        };
        orderDiv.appendChild(deleteBtn);

        // Расчет оставшихся дней до дедлайна
        const now = new Date();
        const daysLeft = Math.ceil((order.deadline - now) / (1000 * 60 * 60 * 24));

        // Применение классов в зависимости от оставшегося времени до дедлайна
        if (daysLeft <= 5 && daysLeft > 2) {
            orderDiv.classList.add('blink-yellow');
        } else if (daysLeft <= 2 && daysLeft > 0) {
            orderDiv.classList.add('blink-red');
        } else if (daysLeft <= 0) {
            orderDiv.classList.add('blink-maroon');
        }

        // Открытие модального окна с информацией о заказе при клике на заказ
        orderDiv.onclick = function() {
            showOrderInfo(order);
        };

        // Добавление заказов в соответствующие контейнеры в зависимости от статуса
        if (order.status === 'waiting') {
            orderDiv.classList.add('waiting'); // Добавляем класс для фильтрации
            waitingContainer.appendChild(orderDiv);
        } else if (order.status === 'completed') {
            orderDiv.classList.add('completed'); // Добавляем класс для фильтрации
            completedContainer.appendChild(orderDiv);
        }
    });
}

// Функция для отображения информации о заказе в модальном окне
function showOrderInfo(order) {
    const modal = document.getElementById('orderInfoModal');
    modal.style.display = 'flex';

    document.getElementById('orderInfoName').innerText = order.name;
    document.getElementById('orderInfoPhone').innerText = order.phone;
    document.getElementById('orderInfoSize').innerText = order.size;
    document.getElementById('orderInfoQuantity').innerText = order.quantity;
    document.getElementById('orderInfoCompany').innerText = order.company;
    document.getElementById('orderInfoNote').innerText = order.note;
    document.getElementById('orderInfoDeadline').innerText = order.deadline.toLocaleDateString();
    document.getElementById('orderInfoPaymentType').innerText = getPaymentTypeText(order.paymentType);
    document.getElementById('orderInfoTotalAmount').innerText = order.totalAmount.toLocaleString();
    document.getElementById('orderInfoDepositAmount').innerText = `${order.depositAmount.toLocaleString()} сум`;

    document.getElementById('orderInfoDepositPercentage').innerText = order.depositPercentage;

    const outstandingElement = document.getElementById('orderInfoOutstandingAmount');
    outstandingElement.innerText = `${order.outstandingAmount.toLocaleString()} сум`;

    if (order.outstandingAmount > 0) {
        outstandingElement.classList.remove('deposit-paid');
        outstandingElement.classList.add('outstanding');
    } else {
        outstandingElement.classList.remove('outstanding');
        outstandingElement.classList.add('deposit-paid');
    }
}

// Функция для преобразования типа оплаты в текст
function getPaymentTypeText(type) {
    switch(type) {
        case 'cash':
            return 'Наличные';
        case 'bank':
            return 'Банковский перевод';
        case 'card':
            return 'Оплата картой';
        default:
            return '';
    }
}

// Функция для закрытия модального окна информации о заказе
function closeOrderInfoModal() {
    document.getElementById('orderInfoModal').style.display = 'none';
}

// Функция для закрытия модального окна оформления заказа
function closeFormModal() {
    document.getElementById('formModal').style.display = 'none';
}

// Функция для открытия модального окна оформления заказа
function openOrderForm() {
    document.getElementById('formModal').style.display = 'flex';
    document.getElementById('newOrderForm').reset();
}

// Сразу отображаем заказы при загрузке страницы
window.onload = function() {
    fetchOrders();
};

// Функции для поиска заказов по тексту в поле поиска
function searchOrders() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const orderElements = document.querySelectorAll('.order');

    orderElements.forEach(orderElement => {
        if (orderElement.innerText.toLowerCase().includes(query)) {
            orderElement.style.display = 'block';
        } else {
            orderElement.style.display = 'none';
        }
    });
}

// Функция для фильтрации заказов по статусу
function filterOrders() {
    const filter = document.getElementById('filterStatus').value;
    const orderElements = document.querySelectorAll('.order');

    orderElements.forEach(orderElement => {
        if (filter === 'all') {
            orderElement.style.display = 'block';
        } else if (filter === 'waiting' && orderElement.classList.contains('waiting')) {
            orderElement.style.display = 'block';
        } else if (filter === 'completed' && orderElement.classList.contains('completed')) {
            orderElement.style.display = 'block';
        } else {
            orderElement.style.display = 'none';
        }
    });
}

// Функция для сортировки заказов по дате дедлайна
function sortOrders() {
    const sort = document.getElementById('sortOrders').value;

    let sortedOrders = [...orders];

    if (sort === 'dateAsc') {
        sortedOrders.sort((a, b) => a.deadline - b.deadline);
    } else if (sort === 'dateDesc') {
        sortedOrders.sort((a, b) => b.deadline - a.deadline);
    }

    orders = sortedOrders;
    renderOrders();
}
