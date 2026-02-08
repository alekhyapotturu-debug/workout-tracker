const calendarGrid = document.getElementById('calendarGrid');
const currentMonthYear = document.getElementById('currentMonthYear');
const prevBtn = document.getElementById('prevMonth');
const nextBtn = document.getElementById('nextMonth');
const modal = document.getElementById('workoutModal');
const closeModal = document.querySelector('.close-modal');
const workoutForm = document.getElementById('workoutForm');
const modalDateTitle = document.getElementById('modalDate');
const existingWorkoutsContainer = document.getElementById('existingWorkouts');
const weightInput = document.getElementById('modalWeight');
const updateWeightBtn = document.getElementById('updateWeightBtn');
const viewWeeklyBtn = document.getElementById('viewWeekly');
const viewMonthlyBtn = document.getElementById('viewMonthly');
const viewYearlyBtn = document.getElementById('viewYearly');
const totalCaloriesDisplay = document.getElementById('totalCalories');

// Toast
const toast = document.getElementById('toast');

// Notification Elements
// Notification Elements
const notifyBtn = document.getElementById('notifyBtn');
const notificationModal = document.getElementById('notificationModal');
const closeNotificationModal = document.querySelector('.close-notification');
const notificationForm = document.getElementById('notificationForm');
const reminderMessageInput = document.getElementById('reminderMessage');
const notificationsEnabledInput = document.getElementById('notificationsEnabled');
const reminderTimesContainer = document.getElementById('reminderTimesContainer');
const addTimeBtn = document.getElementById('addTimeBtn');

let currentDate = new Date();
let selectedDate = null;
let workouts = JSON.parse(localStorage.getItem('workouts')) || {};
// Weights now stored as: { "YYYY-MM-DD": 75.5 }
let weights = JSON.parse(localStorage.getItem('weights')) || {};
let currentWeightView = 'monthly'; // 'weekly' or 'monthly'

// Charts
let activityChart = null;
let weightChart = null;

const WORKOUT_COLORS = {
    'Leg Day': 'var(--color-leg)',
    'Upper Body': 'var(--color-upper)',
    'Core': 'var(--color-core)',
    'Yoga': 'var(--color-yoga)',
    'Cycling': 'var(--color-cycling)',
    'Badminton': 'var(--color-badminton)',
    'Walk (10k)': 'var(--color-walk)',
    'Period': 'var(--color-period)',
    'Other': 'var(--color-other)'
};

// Estimated Calories per session (approx. 1 hour)
const CALORIE_RATES = {
    'Leg Day': 400,
    'Upper Body': 350,
    'Core': 200,
    'Yoga': 250,
    'Cycling': 500,
    'Badminton': 350,
    'Walk (10k)': 400,
    'Period': 0,
    'Other': 300
};

// HEX colors for Chart.js
const CHART_COLORS = {
    active: '#38bdf8',
    period: '#fb7185',
    inactive: '#1e293b'
};

const WORKOUT_ICONS = {
    'Leg Day': '🦵',
    'Upper Body': '💪',
    'Core': '🤸',
    'Yoga': '🧘',
    'Cycling': '🚴',
    'Badminton': '🏸',
    'Walk (10k)': '🚶',
    'Period': '🩸',
    'Other': '✨'
};

function init() {
    renderCalendar();
    setupEventListeners();
    updateStats();
    renderWeightChart();
    checkNotificationPermission();
    checkDailyReminder();

    // Check for reminders every minute so it works if the page is left open
    setInterval(checkDailyReminder, 60000);
}

function setupEventListeners() {
    prevBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
        updateStats(); // Update stats for the new month view
        renderWeightChart(); // Re-render if in monthly view
    });

    nextBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
        updateStats();
        renderWeightChart();
    });

    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
        resetForm();
    });

    // Notification Modal Listeners
    closeNotificationModal.addEventListener('click', () => {
        notificationModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            resetForm();
        }
        if (e.target === notificationModal) {
            notificationModal.style.display = 'none';
        }
    });

    workoutForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveWorkout();
    });

    notificationForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveNotificationSettings();
    });

    if (addTimeBtn) {
        addTimeBtn.addEventListener('click', () => addTimeInput(''));
    }

    updateWeightBtn.addEventListener('click', saveModalWeight);

    viewWeeklyBtn.addEventListener('click', () => {
        setWeightView('weekly');
    });

    viewMonthlyBtn.addEventListener('click', () => {
        setWeightView('monthly');
    });

    viewYearlyBtn.addEventListener('click', () => {
        setWeightView('yearly');
    });

    notifyBtn.addEventListener('click', handleNotificationClick);
}

function setWeightView(view) {
    currentWeightView = view;
    viewWeeklyBtn.classList.remove('active');
    viewMonthlyBtn.classList.remove('active');
    viewYearlyBtn.classList.remove('active');

    if (view === 'weekly') viewWeeklyBtn.classList.add('active');
    if (view === 'monthly') viewMonthlyBtn.classList.add('active');
    if (view === 'yearly') viewYearlyBtn.classList.add('active');

    renderWeightChart();
}

function renderCalendar() {
    calendarGrid.innerHTML = '';

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    currentMonthYear.textContent = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Add Day Headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.classList.add('day-header');
        header.innerText = day;
        calendarGrid.appendChild(header);
    });

    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.classList.add('day-cell', 'empty');
        emptyCell.style.opacity = '0.3';
        calendarGrid.appendChild(emptyCell);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayCell = document.createElement('div');
        dayCell.classList.add('day-cell');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const cellDate = new Date(year, month, day);

        if (cellDate.getTime() === today.getTime()) {
            dayCell.classList.add('today');
        }

        const isFuture = cellDate > today;
        if (isFuture) {
            dayCell.classList.add('future');
        }

        const dateNum = document.createElement('div');
        dateNum.classList.add('day-number');
        dateNum.innerText = day;
        dayCell.appendChild(dateNum);

        const dayContent = document.createElement('div');
        dayContent.classList.add('day-content');

        if (workouts[dateKey] && workouts[dateKey].length > 0) {
            dayCell.classList.add('has-workout'); // Add class for mobile styling
            workouts[dateKey].forEach(workout => {
                const pill = document.createElement('div');
                pill.classList.add('workout-mini-pill');
                pill.style.color = WORKOUT_COLORS[workout.type] || WORKOUT_COLORS['Other'];
                pill.style.border = `1px solid ${WORKOUT_COLORS[workout.type] || WORKOUT_COLORS['Other']}`;

                // Add icon
                const icon = WORKOUT_ICONS[workout.type] || '';
                pill.innerText = `${icon} ${workout.type}`;

                dayContent.appendChild(pill);
            });
        }

        dayCell.appendChild(dayContent);

        if (!isFuture) {
            dayCell.addEventListener('click', () => openModal(dateKey));
        }
        calendarGrid.appendChild(dayCell);
    }
}

function openModal(dateKey) {
    selectedDate = dateKey;
    const dateObj = new Date(dateKey);
    modalDateTitle.textContent = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    // ... Inside openModal ...

    // Set weight input if exists for this date
    if (weights[selectedDate]) {
        weightInput.value = weights[selectedDate];
    } else {
        weightInput.value = '';
    }

    renderExistingWorkouts();
    modal.style.display = 'flex';
}

// ... 

function saveModalWeight() {
    const weightVal = parseFloat(weightInput.value);

    if (weightVal) {
        weights[selectedDate] = weightVal;
        localStorage.setItem('weights', JSON.stringify(weights));

        showToast("Weight updated successfully!");
        renderWeightChart();
    }
}

function renderExistingWorkouts() {
    existingWorkoutsContainer.innerHTML = '';
    if (workouts[selectedDate] && workouts[selectedDate].length > 0) {
        workouts[selectedDate].forEach((workout, index) => {
            const item = document.createElement('div');
            item.classList.add('existing-item');

            // Format calories text
            const calories = CALORIE_RATES[workout.type] || 0;
            const caloriesText = calories > 0 ? `<span style="font-size:0.8rem; opacity:0.7">~${calories} kcal</span>` : '';
            const icon = WORKOUT_ICONS[workout.type] || '';

            const info = document.createElement('div');
            info.innerHTML = `
                <div><strong style="color:${WORKOUT_COLORS[workout.type]}">${icon} ${workout.type}</strong> ${caloriesText}</div>
                <div style="font-size:0.85rem; opacity:0.8">${workout.notes || ''}</div>
            `;

            const trash = document.createElement('i');
            trash.classList.add('fa-solid', 'fa-trash', 'trash-btn');
            trash.onclick = () => deleteWorkout(index);

            item.appendChild(info);
            item.appendChild(trash);
            existingWorkoutsContainer.appendChild(item);
        });
    } else {
        existingWorkoutsContainer.innerHTML = '<p style="color:var(--text-secondary); font-style:italic; font-size:0.9rem;">No entries yet.</p>';
    }
}

// Toast Function
function showToast(message) {
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function saveModalWeight() {
    const weightVal = parseFloat(weightInput.value);

    if (weightVal) {
        weights[selectedDate] = weightVal;
        localStorage.setItem('weights', JSON.stringify(weights));

        showToast("Weight updated successfully!");
        renderWeightChart();
    }
}

function saveWorkout() {
    const typeInput = document.querySelector('input[name="workoutType"]:checked');
    const notes = document.getElementById('notes').value;
    const weightVal = parseFloat(weightInput.value);

    let savedSomething = false;

    // Save Workout (ONLY if type is selected)
    if (typeInput) {
        const type = typeInput.value;
        if (!workouts[selectedDate]) {
            workouts[selectedDate] = [];
        }
        workouts[selectedDate].push({ type, notes });
        localStorage.setItem('workouts', JSON.stringify(workouts));
        savedSomething = true;
    }

    // Save Weight (if entered)
    if (weightVal) {
        weights[selectedDate] = weightVal;
        localStorage.setItem('weights', JSON.stringify(weights));
        savedSomething = true;
    }
    // If input is cleared but weight exists in DB, delete it
    else if (weightInput.value === '' && weights[selectedDate]) {
        delete weights[selectedDate];
        localStorage.setItem('weights', JSON.stringify(weights));
        savedSomething = true;
    }

    if (!savedSomething) {
        // User didn't enter anything specific, just close modal
        modal.style.display = 'none';
        return;
    }

    renderExistingWorkouts();
    renderCalendar();
    updateStats(); // Refresh charts
    renderWeightChart(); // Refresh weight chart

    // Clear form
    if (typeInput) typeInput.checked = false;
    document.getElementById('notes').value = '';

    // Close modal & Show Toast
    modal.style.display = 'none';
    showToast("Entry saved successfully!");
}

function deleteWorkout(index) {
    workouts[selectedDate].splice(index, 1);
    if (workouts[selectedDate].length === 0) {
        delete workouts[selectedDate];
    }
    localStorage.setItem('workouts', JSON.stringify(workouts));
    renderExistingWorkouts();
    renderCalendar();
    updateStats(); // Refresh charts
}

function resetForm() {
    document.getElementById('notes').value = '';
    weightInput.value = '';
}

// --- Stats & Analytics ---

function updateStats() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-indexed
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let activeDays = 0;
    let periodDays = 0;
    let totalCalories = 0;

    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayWorkouts = workouts[dateKey];

        if (dayWorkouts && dayWorkouts.length > 0) {
            const hasActive = dayWorkouts.some(w => w.type !== 'Period');
            const hasPeriod = dayWorkouts.some(w => w.type === 'Period');

            if (hasActive) {
                activeDays++;
            } else if (hasPeriod) {
                periodDays++;
            }

            // Calories
            dayWorkouts.forEach(w => {
                totalCalories += (CALORIE_RATES[w.type] || 0);
            });
        }
    }

    const inactiveDays = daysInMonth - activeDays - periodDays;

    totalCaloriesDisplay.textContent = totalCalories.toLocaleString();
    renderActivityChart(activeDays, periodDays, inactiveDays);
}

function renderActivityChart(active, period, inactive) {
    const ctx = document.getElementById('activityChart').getContext('2d');

    if (activityChart) {
        activityChart.destroy();
    }

    activityChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Active', 'Period', 'Inactive'],
            datasets: [{
                data: [active, period, inactive],
                backgroundColor: [CHART_COLORS.active, CHART_COLORS.period, CHART_COLORS.inactive],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#94a3b8', font: { family: 'Outfit', size: 11 } }
                }
            },
            cutout: '70%'
        }
    });
}

// --- Interpolated Weight Logic ---

function getInterpolatedWeights(viewMode) {
    const labels = [];
    const data = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let startDate = new Date();
    let endDate = new Date(today);

    if (viewMode === 'weekly') {
        // Last 7 days
        startDate.setDate(today.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

        generateDailyData(startDate, endDate, labels, data);

    } else if (viewMode === 'monthly') {
        // Current Month
        startDate.setFullYear(currentDate.getFullYear(), currentDate.getMonth(), 1);
        endDate.setFullYear(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        // Don't show future days (unless in past month, then show all)
        if (endDate > today) endDate = new Date(today);

        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

        generateDailyData(startDate, endDate, labels, data);

    } else if (viewMode === 'yearly') {
        // Current Year (Monthly Averages)
        const year = currentDate.getFullYear();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        // Get sorted weight keys
        const allDates = Object.keys(weights).sort();

        // Seed last known weight (from previous year)
        let lastKnownWeight = null;
        for (let dStr of allDates) {
            if (new Date(dStr).getFullYear() < year) {
                lastKnownWeight = weights[dStr];
            }
        }

        for (let m = 0; m < 12; m++) {
            labels.push(monthNames[m]);

            // Calculate average for this month
            let sum = 0;
            let count = 0;

            // Filter weights for this month
            for (let dStr of allDates) {
                const d = new Date(dStr);
                if (d.getFullYear() === year && d.getMonth() === m) {
                    sum += weights[dStr];
                    count++;
                }
            }

            if (count > 0) {
                const avg = sum / count;
                data.push(avg);
                lastKnownWeight = avg;
            } else {
                data.push(lastKnownWeight); // Interpolate
            }

            // Do not plot future months
            if (m > today.getMonth() && year === today.getFullYear()) {
                data[data.length - 1] = null; // Hide future
            }
        }
    }

    return { labels, data };
}

function generateDailyData(startDate, endDate, labels, data) {
    // Find last known weight before start date
    let lastKnownWeight = null;
    const allDates = Object.keys(weights).sort();
    for (let dStr of allDates) {
        const d = new Date(dStr);
        d.setHours(0, 0, 0, 0);
        if (d < startDate) {
            lastKnownWeight = weights[dStr];
        } else {
            break;
        }
    }

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;

        let val = weights[dateKey];
        if (val === undefined || val === null) {
            val = lastKnownWeight;
        } else {
            lastKnownWeight = val;
        }

        const label = d.getTime() > new Date().setDate(new Date().getDate() - 7) ? d.toLocaleDateString('en-US', { weekday: 'short' }) : String(d.getDate()).padStart(2, '0');

        labels.push(label);
        data.push(val);
    }
}


function renderWeightChart() {
    const ctx = document.getElementById('weightChart').getContext('2d');
    const { labels, data } = getInterpolatedWeights(currentWeightView);

    if (weightChart) {
        weightChart.destroy();
    }

    weightChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Weight (Kg)',
                data: data,
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#38bdf8',
                spanGaps: true
            }]
        },
        options: {
            scales: {
                y: {
                    ticks: { color: '#64748b' },
                    grid: { color: '#334155' }
                },
                x: {
                    ticks: { color: '#64748b' },
                    grid: { display: false }
                }
            }
        }
    });
}

// --- Notification Logic ---

// Notification Elements (Already declared at top, ensuring they are used correctly)
// const notifyBtn = document.getElementById('notifyBtn');
// const notificationModal = document.getElementById('notificationModal');
// ... (Variables are already global)

function getNotificationSettings() {
    const defaults = {
        enabled: false,
        times: ["09:00"], // Array of times
        message: "Time to crush it! 💪"
    };

    const saved = JSON.parse(localStorage.getItem('notificationSettings'));
    if (!saved) return defaults;

    // Migrate old format (single time) to new (array)
    if (saved.time && !saved.times) {
        saved.times = [saved.time];
        delete saved.time;
    }

    return { ...defaults, ...saved };
}

function checkNotificationPermission() {
    const settings = getNotificationSettings();

    // Always show button because we have fallback
    notifyBtn.style.display = 'block';

    if (settings.enabled) {
        notifyBtn.innerHTML = '<i class="fa-solid fa-bell"></i>';
        notifyBtn.style.color = '#38bdf8';
    } else {
        notifyBtn.innerHTML = '<i class="fa-regular fa-bell"></i>';
        notifyBtn.style.color = '';
    }
}

function handleNotificationClick() {
    openNotificationSettings();
}

function renderTimeInputs(times) {
    reminderTimesContainer.innerHTML = '';
    times.forEach(time => {
        addTimeInput(time);
    });
    if (times.length === 0) {
        addTimeInput(''); // Add at least one empty
    }
}

function addTimeInput(value = '') {
    const div = document.createElement('div');
    div.classList.add('time-row');

    const input = document.createElement('input');
    input.type = 'time';
    input.classList.add('glass-input');
    input.value = value;
    input.required = true;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.classList.add('remove-time-btn');
    btn.innerHTML = '<i class="fa-solid fa-times"></i>';
    btn.onclick = () => div.remove();

    div.appendChild(input);
    div.appendChild(btn);
    reminderTimesContainer.appendChild(div);
}

function openNotificationSettings() {
    const settings = getNotificationSettings();
    renderTimeInputs(settings.times);
    reminderMessageInput.value = settings.message;
    notificationsEnabledInput.checked = settings.enabled;
    notificationModal.style.display = 'flex';
}

function saveNotificationSettings() {
    // Collect times
    const timeInputs = reminderTimesContainer.querySelectorAll('input[type="time"]');
    const times = Array.from(timeInputs).map(input => input.value).filter(val => val !== '');

    const settings = {
        enabled: notificationsEnabledInput.checked,
        times: times,
        message: reminderMessageInput.value
    };

    // Save settings first
    localStorage.setItem('notificationSettings', JSON.stringify(settings));

    // If enabling, try to get system permission (nice to have)
    if (settings.enabled && 'Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission().then(() => {
            // Re-render button state regardless of outcome
            checkNotificationPermission();
        });
    }

    notificationModal.style.display = 'none';
    checkNotificationPermission();
    showToast("Settings saved!");
    checkDailyReminder(); // Re-check with new settings
}

// In-App Notification Elements
const inAppNotification = document.getElementById('inAppNotification');
const inAppNotificationMessage = document.getElementById('inAppNotificationMessage');
const closeInAppBtn = document.querySelector('.close-in-app');

if (closeInAppBtn) {
    closeInAppBtn.addEventListener('click', () => {
        inAppNotification.classList.add('hidden');
    });
}

function showInAppNotification(message) {
    inAppNotificationMessage.textContent = message;
    inAppNotification.classList.remove('hidden');

    // Auto hide after 5 seconds
    setTimeout(() => {
        inAppNotification.classList.add('hidden');
    }, 5000);
}

function checkDailyReminder() {
    const settings = getNotificationSettings();
    if (!settings.enabled || settings.times.length === 0) return;

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;

    if (!workouts[dateKey]) {
        const nowHour = today.getHours();
        const nowMinute = today.getMinutes();

        // Check each time slot
        settings.times.forEach(timeStr => {
            const [remHour, remMinute] = timeStr.split(':').map(Number);

            // Check if it's past reminder time
            if (nowHour > remHour || (nowHour === remHour && nowMinute >= remMinute)) {
                // Check if THIS specific time slot was already reminded today
                const reminderKey = `reminded_${dateKey}_${timeStr}`;

                if (!sessionStorage.getItem(reminderKey)) {

                    // Try System Notification first
                    if ('Notification' in window && Notification.permission === 'granted') {
                        new Notification("Workout Reminder 🏋️", {
                            body: settings.message,
                            icon: "icon.png"
                        });
                    } else {
                        // Fallback to In-App Notification
                        showInAppNotification(settings.message);
                    }

                    sessionStorage.setItem(reminderKey, 'true');
                }
            }
        });
    }
}

// Start App
init();
