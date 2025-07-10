const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

// Get elements from HTML
const addBtn = $(".add-btn");
const taskGrid = $(".task-grid");
const modal = $("#addTaskModal");
const modalOverlay = $(".modal-overlay");
const modalClose = $(".modal-close");
const todoForm = $(".todo-app-form");
const taskTitleInput = $("#taskTitle");
const taskDescriptionInput = $("#taskDescription");
const taskCategorySelect = $("#taskCategory");
const taskPrioritySelect = $("#taskPriority");
const startTimeInput = $("#startTime");
const endTimeInput = $("#endTime");
const taskDateInput = $("#taskDate");
const taskColorSelect = $("#taskColor");
const cancelBtn = $(".btn-secondary");
const searchInput = $(".search-input");
const tabButtons = $$(".tab-button");

// Tab constants
const TAB_KEYS = {
    allTab: "all",
    activeTab: "active",
    completedTab: "completed"
};

// Variables to track editing and deleting
let editIndex = null;
let deleteIndex = null;

// Load tasks from localStorage or initialize empty array
let todoTasks = JSON.parse(localStorage.getItem("todoTasks")) || [];

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
    // Load active tab from localStorage
    const activeTab = localStorage.getItem("activeTab") || TAB_KEYS.allTab;

    // Remove active class from all tabs
    tabButtons.forEach(tab => tab.classList.remove("active"));

    // Find and activate the correct tab
    const currentTab = $(`.tab-button[data-tab="${activeTab}"]`) || 
                      $(`.tab-button:first-child`);
    
    if (currentTab) {
        currentTab.classList.add("active");
    }

    // Display tasks based on active tab
    const tasks = getTasksByTab(activeTab);
    renderTasks(tasks);
});

// Function to remove Vietnamese tones for search
function removeVietnameseTones(str) {
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .trim();
}

// Search functionality
if (searchInput) {
    searchInput.oninput = function (event) {
        const keyword = removeVietnameseTones(event.target.value);

        // Switch to 'All' tab when searching
        tabButtons.forEach((tab) => tab.classList.remove("active"));
        const allTab = $(`.tab-button[data-tab="${TAB_KEYS.allTab}"]`) || 
                      $(`.tab-button:first-child`);
        if (allTab) allTab.classList.add("active");

        const filteredTasks = todoTasks.filter(task => {
            const title = removeVietnameseTones(task.title || '');
            const description = removeVietnameseTones(task.description || '');
            return title.includes(keyword) || description.includes(keyword);
        });

        if (!filteredTasks.length && keyword) {
            taskGrid.innerHTML = "<p style='text-align: center; color: #666; padding: 2rem;'>No tasks found</p>";
            return;
        }

        renderTasks(keyword ? filteredTasks : todoTasks);
    };
}

// Function to close modal
function closeModal() {
    modal.className = "modal-overlay";

    // Reset form title
    const formTitle = modal.querySelector(".modal-title");
    if (formTitle && formTitle.dataset.original) {
        formTitle.textContent = formTitle.dataset.original;
        delete formTitle.dataset.original;
    }

    // Reset submit button text
    const submitBtn = modal.querySelector(".btn-primary");
    if (submitBtn && submitBtn.dataset.original) {
        submitBtn.textContent = submitBtn.dataset.original;
        delete submitBtn.dataset.original;
    }

    // Reset form and edit state
    todoForm.reset();
    editIndex = null;
}

// Function to open modal
function openModal() {
    modal.className = "modal-overlay show";
    setTimeout(() => taskTitleInput.focus(), 100);
}

// Function to check for duplicate titles
function checkTitleDuplicate(title, taskIndex) {
    const normalizedTitle = removeVietnameseTones(title);
    
    return todoTasks.some((task, index) => {
        if (taskIndex !== null && index === taskIndex) return false;
        return removeVietnameseTones(task.title || '') === normalizedTitle;
    });
}

// Handle form submission
function handleFormSubmit(e) {
    e.preventDefault();
    
    // Get form data
    const formData = new FormData(todoForm);
    const taskData = {
        title: formData.get('taskTitle')?.trim() || '',
        description: formData.get('taskDescription')?.trim() || '',
        category: formData.get('taskCategory') || '',
        priority: formData.get('taskPriority') || 'medium',
        startTime: formData.get('startTime') || '',
        endTime: formData.get('endTime') || '',
        dueDate: formData.get('taskDate') || '',
        cardColor: formData.get('taskColor') || 'blue',
        isCompleted: false
    };

    // Check for duplicate title
    const isDuplicate = checkTitleDuplicate(taskData.title, editIndex);
    if (isDuplicate) {
        showToast({
            text: "Task title already exists!",
            backgroundColor: "#dc3545"
        });
        return;
    }

    // Edit existing task
    if (editIndex !== null) {
        todoTasks[editIndex] = { ...todoTasks[editIndex], ...taskData };
        showToast({
            text: "Task updated successfully!",
            backgroundColor: "#0d6efd"
        });
    }
    // Add new task
    else {
        todoTasks.unshift(taskData);
        showToast({
            text: "Task created successfully!",
            backgroundColor: "#198754"
        });
    }

    // Save to localStorage
    saveTasks();
    
    // Close modal and refresh display
    closeModal();
    
    // Render tasks based on current active tab
    const activeTab = localStorage.getItem("activeTab") || TAB_KEYS.allTab;
    const tasks = getTasksByTab(activeTab);
    renderTasks(tasks);
}

// Function to save tasks to localStorage
function saveTasks() {
    localStorage.setItem("todoTasks", JSON.stringify(todoTasks));
}

// Function to save active tab
function saveTabActive(tab = TAB_KEYS.allTab) {
    localStorage.setItem("activeTab", tab);
}

// Function to get tasks by tab
function getTasksByTab(tab) {
    switch (tab) {
        case TAB_KEYS.activeTab:
            return todoTasks.filter(task => !task.isCompleted);
        case TAB_KEYS.completedTab:
            return todoTasks.filter(task => task.isCompleted);
        default:
            return todoTasks;
    }
}

// Function to render tasks
function renderTasks(tasks = todoTasks) {
    if (!tasks.length) {
        taskGrid.innerHTML = "<p style='text-align: center; color: #666; padding: 2rem;'>No tasks available</p>";
        return;
    }

    taskGrid.innerHTML = '';
    
    tasks.forEach((task, globalIndex) => {
        // Find the actual index in the todoTasks array
        const actualIndex = todoTasks.findIndex(t => 
            t.title === task.title && 
            t.description === task.description && 
            t.startTime === task.startTime
        );

        const timeDisplay = task.startTime && task.endTime 
            ? `${formatTime(task.startTime)} - ${formatTime(task.endTime)}`
            : 'No time set';
            
        const taskCard = document.createElement('div');
        taskCard.className = `task-card ${task.cardColor}${task.isCompleted ? ' completed' : ''}`;
        
        taskCard.innerHTML = `
            <div class="task-header">
                <h3 class="task-title">${task.title}</h3>
                <button class="task-menu">
                    <i class="fa-solid fa-ellipsis fa-icon"></i>
                    <div class="dropdown-menu">
                        <div class="dropdown-item edit-btn" data-index="${actualIndex}">
                            <i class="fa-solid fa-pen-to-square fa-icon"></i>
                            Edit
                        </div>
                        <div class="dropdown-item complete-btn" data-index="${actualIndex}">
                            <i class="fa-solid fa-check fa-icon"></i>
                            ${task.isCompleted ? 'Mark as Active' : 'Mark as Complete'}
                        </div>
                        <div class="dropdown-item delete delete-btn" data-index="${actualIndex}">
                            <i class="fa-solid fa-trash fa-icon"></i>
                            Delete
                        </div>
                    </div>
                </button>
            </div>
            <p class="task-description">${task.description || 'No description'}</p>
            <div class="task-time">${timeDisplay}</div>
        `;
        
        taskGrid.appendChild(taskCard);
    });
}

// Function to format time
function formatTime(time) {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

// Handle task actions (edit, complete, delete)
taskGrid.onclick = function (event) {
    const editBtn = event.target.closest(".edit-btn");
    const deleteBtn = event.target.closest(".delete-btn");
    const completeBtn = event.target.closest(".complete-btn");

    // Edit task
    if (editBtn) {
        const taskIndex = parseInt(editBtn.dataset.index);
        const task = todoTasks[taskIndex];

        editIndex = taskIndex;

        // Fill form with task data
        taskTitleInput.value = task.title || '';
        taskDescriptionInput.value = task.description || '';
        taskCategorySelect.value = task.category || '';
        taskPrioritySelect.value = task.priority || 'medium';
        startTimeInput.value = task.startTime || '';
        endTimeInput.value = task.endTime || '';
        taskDateInput.value = task.dueDate || '';
        taskColorSelect.value = task.cardColor || 'blue';

        // Change modal title and button text
        const formTitle = modal.querySelector(".modal-title");
        if (formTitle) {
            formTitle.dataset.original = formTitle.textContent;
            formTitle.textContent = "Edit Task";
        }

        const submitBtn = modal.querySelector(".btn-primary");
        if (submitBtn) {
            submitBtn.dataset.original = submitBtn.textContent;
            submitBtn.textContent = "Save Changes";
        }

        openModal();
    }

    // Delete task
    if (deleteBtn) {
        const taskIndex = parseInt(deleteBtn.dataset.index);
        const task = todoTasks[taskIndex];

        if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
            todoTasks.splice(taskIndex, 1);
            saveTasks();
            
            showToast({
                text: "Task deleted successfully!",
                backgroundColor: "#dc3545"
            });

            // Refresh display
            const activeTab = localStorage.getItem("activeTab") || TAB_KEYS.allTab;
            const tasks = getTasksByTab(activeTab);
            renderTasks(tasks);
        }
    }

    // Toggle completion
    if (completeBtn) {
        const taskIndex = parseInt(completeBtn.dataset.index);
        const task = todoTasks[taskIndex];

        task.isCompleted = !task.isCompleted;
        saveTasks();

        showToast({
            text: task.isCompleted ? "Task completed!" : "Task marked as active!",
            backgroundColor: "#198754"
        });

        // Refresh display
        const activeTab = localStorage.getItem("activeTab") || TAB_KEYS.allTab;
        const tasks = getTasksByTab(activeTab);
        renderTasks(tasks);
    }
};

// Handle tab clicks
document.addEventListener('click', function(event) {
    const tabButton = event.target.closest(".tab-button");
    if (!tabButton) return;

    const tabValue = tabButton.dataset.tab || TAB_KEYS.allTab;

    // Remove active class from all tabs
    tabButtons.forEach((tab) => tab.classList.remove("active"));

    // Activate clicked tab
    tabButton.classList.add("active");

    // Save active tab
    saveTabActive(tabValue);

    // Render tasks for the selected tab
    const tasks = getTasksByTab(tabValue);
    renderTasks(tasks);
});

// Simple toast notification function
function showToast({
    text = "",
    duration = 3000,
    backgroundColor = "#198754"
}) {
    // Create toast element
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: ${backgroundColor};
        color: white;
        padding: 12px 24px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-family: inherit;
        font-size: 14px;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    toast.textContent = text;

    // Add to page
    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);

    // Remove after duration
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, duration);
}

// Event listeners
addBtn.addEventListener('click', openModal);
modalClose.addEventListener('click', closeModal);
cancelBtn.addEventListener('click', closeModal);
todoForm.addEventListener('submit', handleFormSubmit);

// Close modal when clicking outside
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
        closeModal();
    }
});
