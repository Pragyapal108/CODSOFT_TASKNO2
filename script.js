
const QUIZ_KEY = "quiznest_quizzes";
const USER_KEY = "quiznest_users";
const LOGIN_KEY = "quiznest_logged_in";

let authMode = "login";
let currentQuiz = null;
let currentQuestionIndex = 0;
let selectedAnswers = [];
let lastQuizId = null;

const $ = id => document.getElementById(id);

function getQuizzes() {
    try {
        return JSON.parse(localStorage.getItem(QUIZ_KEY)) || [];
    } catch {
        return [];
    }
}

function saveQuizzes(quizzes) {
    localStorage.setItem(QUIZ_KEY, JSON.stringify(quizzes));
    updateQuizCount();
}

function getUsers() {
    try {
        return JSON.parse(localStorage.getItem(USER_KEY)) || [];
    } catch {
        return [];
    }
}

function showPage(pageId) {
    document.querySelectorAll(".page").forEach(page => {
        page.classList.toggle("hidden", page.id !== pageId);
    });
    window.scrollTo(0, 0);
}

function showHome() {
    updateQuizCount();
    showPage("homePage");
}

function updateQuizCount() {
    $("quizCount").textContent = getQuizzes().length;
}

function updateUserUI() {
    const email = localStorage.getItem(LOGIN_KEY);
    $("userLabel").textContent = email ? `Hi, ${email.split("@")[0]}` : "";
    $("authButton").classList.toggle("hidden", Boolean(email));
    $("logoutButton").classList.toggle("hidden", !email);
}

function openAuth() {
    setAuthMode("login");
    $("authForm").reset();
    $("authMessage").textContent = "";
    showPage("authPage");
}

function setAuthMode(mode) {
    authMode = mode;

    $("authTitle").textContent =
        mode === "login" ? "Welcome Back" : "Create Your Account";

    $("authSubmit").textContent =
        mode === "login" ? "Login" : "Register";

    $("authName").classList.toggle("hidden", mode === "login");
    $("nameLabel").classList.toggle("hidden", mode === "login");
    $("authName").required = mode === "register";
    $("authMessage").textContent = "";
}

$("authForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const email = $("authEmail").value.trim().toLowerCase();
    const password = $("authPassword").value;
    const users = getUsers();

    if (authMode === "register") {
        const name = $("authName").value.trim();

        if (!name) {
            $("authMessage").textContent = "Enter your name.";
            return;
        }

        if (users.some(user => user.email === email)) {
            $("authMessage").textContent =
                "This email is already registered.";
            return;
        }

        users.push({ name, email, password });
        localStorage.setItem(USER_KEY, JSON.stringify(users));
        localStorage.setItem(LOGIN_KEY, email);

        updateUserUI();
        showHome();
        alert("Registration successful!");
    } else {
        const user = users.find(
            item => item.email === email &&
                    item.password === password
        );

        if (!user) {
            $("authMessage").textContent =
                "Invalid login. Please check your details or register.";
            return;
        }

        localStorage.setItem(LOGIN_KEY, email);
        updateUserUI();
        showHome();
        alert("Login successful!");
    }
});

function logout() {
    localStorage.removeItem(LOGIN_KEY);
    updateUserUI();
    showHome();
    alert("You have logged out.");
}

// QUIZ CREATION

function startCreate() {
    $("createForm").reset();
    $("createMessage").textContent = "";
    $("questionBuilder").innerHTML = "";

    addQuestion();
    showPage("createPage");
}

function addQuestion() {
    const number =
        $("questionBuilder").children.length + 1;

    const editor = document.createElement("div");
    editor.className = "question-editor";

    editor.innerHTML = `
        <h3>Question ${number}</h3>

        <label>Question Text</label>
        <textarea class="question-text"
            placeholder="Enter your question"
            maxlength="500" required></textarea>

        <div class="option-fields">
            ${[0, 1, 2, 3].map(i => `
                <div>
                    <label>Option ${String.fromCharCode(65 + i)}</label>
                    <input class="question-option"
                        placeholder="Enter option ${String.fromCharCode(65 + i)}"
                        maxlength="200" required>
                </div>
            `).join("")}
        </div>

        <label>Correct Answer</label>
        <select class="correct-answer">
            <option value="0">Option A</option>
            <option value="1">Option B</option>
            <option value="2">Option C</option>
            <option value="3">Option D</option>
        </select>

        ${number > 1 ?
            '<button type="button" class="remove-question">Remove Question</button>'
            : ""}
    `;

    const removeButton =
        editor.querySelector(".remove-question");

    if (removeButton) {
        removeButton.addEventListener("click", () => {
            editor.remove();
            renumberQuestions();
        });
    }

    $("questionBuilder").appendChild(editor);
    renumberQuestions();
}

function renumberQuestions() {
    document.querySelectorAll(".question-editor").forEach(
        (editor, index) => {
            editor.querySelector("h3").textContent =
                `Question ${index + 1}`;
        }
    );
}

$("createForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const title = $("quizTitle").value.trim();
    const description = $("quizDescription").value.trim();
    const editors = [
        ...$("questionBuilder").querySelectorAll(".question-editor")
    ];

    if (!title || editors.length === 0) {
        $("createMessage").textContent =
            "Enter a title and add at least one question.";
        return;
    }

    const questions = [];

    for (let i = 0; i < editors.length; i++) {
        const editor = editors[i];
        const question =
            editor.querySelector(".question-text").value.trim();

        const options = [
            ...editor.querySelectorAll(".question-option")
        ].map(input => input.value.trim());

        const correctAnswer =
            Number(editor.querySelector(".correct-answer").value);

        if (!question || options.some(option => !option)) {
            $("createMessage").textContent =
                `Complete Question ${i + 1} and all four options.`;
            return;
        }

        if (new Set(options.map(o => o.toLowerCase())).size !== 4) {
            $("createMessage").textContent =
                `All four options must be different in Question ${i + 1}.`;
            return;
        }

        questions.push({
            question,
            options,
            correctAnswer
        });
    }

    const quizzes = getQuizzes();

    quizzes.unshift({
        id: Date.now().toString() + Math.random().toString(16).slice(2),
        title,
        description: description || "Test your knowledge.",
        questions,
        createdBy: localStorage.getItem(LOGIN_KEY) || "Guest"
    });

    saveQuizzes(quizzes);
    alert("Quiz created successfully!");
    showQuizList();
});

// QUIZ LISTING AND SEARCH

function showQuizList() {
    renderQuizList($("quizSearch").value.trim());
    showPage("listPage");
}

function renderQuizList(searchTerm = "") {
    const quizzes = getQuizzes();

    const filtered = quizzes.filter(quiz =>
        (quiz.title + " " + quiz.description)
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
    );

    $("quizList").innerHTML = "";
    $("emptyQuizzes").classList.toggle(
        "hidden", filtered.length > 0
    );

    filtered.forEach(quiz => {
        const card = document.createElement("article");
        card.className = "quiz-card";

        const title = document.createElement("h3");
        title.textContent = quiz.title;

        const description = document.createElement("p");
        description.textContent = quiz.description;

        const meta = document.createElement("p");
        meta.textContent =
            `${quiz.questions.length} questions · By ${quiz.createdBy || "Guest"}`;

        const button = document.createElement("button");
        button.textContent = "Start Quiz";
        button.addEventListener("click", () => beginQuiz(quiz.id));

        card.append(title, description, meta, button);
        $("quizList").appendChild(card);
    });
}

$("quizSearch").addEventListener("input", function() {
    renderQuizList(this.value.trim());
});

// TAKING A QUIZ

function beginQuiz(id) {
    const quiz = getQuizzes().find(item => item.id === id);

    if (!quiz) {
        alert("Quiz not found.");
        showQuizList();
        return;
    }

    currentQuiz = quiz;
    lastQuizId = id;
    currentQuestionIndex = 0;

    selectedAnswers =
        new Array(quiz.questions.length).fill(null);

    $("takingTitle").textContent = quiz.title;
    $("takingDescription").textContent = quiz.description;

    showPage("takePage");
    renderQuestion();
}

function renderQuestion() {
    const question =
        currentQuiz.questions[currentQuestionIndex];

    const total = currentQuiz.questions.length;
    const number = currentQuestionIndex + 1;
    const percent = Math.round((number / total) * 100);

    $("questionProgress").textContent =
        `Question ${number} of ${total}`;

    $("progressBar").style.width = percent + "%";
    $("takingQuestion").textContent = question.question;
    $("answerOptions").innerHTML = "";
    $("answerMessage").textContent = "";

    question.options.forEach((option, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "answer-option";

        button.textContent =
            `${String.fromCharCode(65 + index)}. ${option}`;

        if (selectedAnswers[currentQuestionIndex] === index) {
            button.classList.add("selected");
        }

        button.addEventListener("click", () => {
            selectedAnswers[currentQuestionIndex] = index;

            document.querySelectorAll(".answer-option")
                .forEach((item, i) => {
                    item.classList.toggle("selected", i === index);
                });

            $("nextQuestionButton").disabled = false;
        });

        $("answerOptions").appendChild(button);
    });

    $("nextQuestionButton").disabled =
        selectedAnswers[currentQuestionIndex] === null;

    $("nextQuestionButton").textContent =
        number === total ? "Finish Quiz" : "Next Question";
}

function nextQuestion() {
    if (selectedAnswers[currentQuestionIndex] === null) {
        $("answerMessage").textContent =
            "Please select an answer first.";
        return;
    }

    if (currentQuestionIndex <
        currentQuiz.questions.length - 1) {
        currentQuestionIndex++;
        renderQuestion();
    } else {
        showResults();
    }
}

// RESULTS AND ANSWER REVIEW

function showResults() {
    const questions = currentQuiz.questions;
    let score = 0;

    questions.forEach((question, index) => {
        if (selectedAnswers[index] === question.correctAnswer) {
            score++;
        }
    });

    const percentage =
        Math.round((score / questions.length) * 100);

    $("scoreValue").textContent =
        `${score} / ${questions.length}`;

    $("scorePercent").textContent =
        `${percentage}%`;

    $("resultHeading").textContent =
        percentage === 100 ? "Perfect Score!" :
        percentage >= 60 ? "Great Effort!" :
        "Keep Practising!";

    $("resultSubtitle").textContent =
        `Results for ${currentQuiz.title}`;

    $("resultFeedback").textContent =
        percentage >= 60
        ? "Well done! Review your answers to learn even more."
        : "Keep learning! Check the correct answers and try again.";

    $("answerReview").innerHTML = "";

    questions.forEach((question, index) => {
        const chosen = selectedAnswers[index];
        const correct = chosen === question.correctAnswer;

        const item = document.createElement("div");
        item.className =
            "review-item " + (correct ? "correct" : "incorrect");

        const heading = document.createElement("h3");
        heading.textContent =
            `${index + 1}. ${question.question}`;

        const yourAnswer = document.createElement("p");
        yourAnswer.className =
            correct ? "correct-text" : "wrong-text";

        yourAnswer.textContent =
            "Your answer: " +
            (chosen === null ? "Not answered" : question.options[chosen]);

        const correctAnswer = document.createElement("p");
        correctAnswer.className = "correct-text";
        correctAnswer.textContent =
            "Correct answer: " +
            question.options[question.correctAnswer];

        item.append(heading, yourAnswer, correctAnswer);
        $("answerReview").appendChild(item);
    });

    showPage("resultPage");
}

function retryQuiz() {
    if (lastQuizId) {
        beginQuiz(lastQuizId);
    }
}

// SAMPLE QUIZZES

function addSampleQuizzes() {
    if (localStorage.getItem(QUIZ_KEY) !== null) {
        return;
    }

    const samples = [
        {
            id: "python-basics",
            title: "Python Basics",
            description: "Test your Python fundamentals.",
            createdBy: "QuizNest",
            questions: [
                {
                    question: "Which keyword defines a function in Python?",
                    options: ["function", "def", "fun", "define"],
                    correctAnswer: 1
                },
                {
                    question: "Which data type stores key-value pairs?",
                    options: ["List", "Tuple", "Dictionary", "String"],
                    correctAnswer: 2
                },
                {
                    question: "What is the output of len('Quiz')?",
                    options: ["3", "4", "5", "Error"],
                    correctAnswer: 1
                }
            ]
        },
        {
            id: "web-basics",
            title: "Web Development Basics",
            description: "HTML, CSS and JavaScript fundamentals.",
            createdBy: "QuizNest",
            questions: [
                {
                    question: "What does HTML stand for?",
                    options: [
                        "HyperText Markup Language",
                        "HighText Machine Language",
                        "HyperTool Multi Language",
                        "Home Tool Markup Language"
                    ],
                    correctAnswer: 0
                },
                {
                    question: "Which language styles web pages?",
                    options: ["SQL", "CSS", "Python", "C"],
                    correctAnswer: 1
                },
                {
                    question: "Which tag creates the largest standard heading?",
                    options: ["<heading>", "<h6>", "<head>", "<h1>"],
                    correctAnswer: 3
                }
            ]
        },
        {
            id: "general-knowledge",
            title: "General Knowledge",
            description: "A quick general knowledge challenge.",
            createdBy: "QuizNest",
            questions: [
                {
                    question: "Which planet is called the Red Planet?",
                    options: ["Venus", "Mars", "Jupiter", "Mercury"],
                    correctAnswer: 1
                },
                {
                    question: "How many days are in a leap year?",
                    options: ["364", "365", "366", "367"],
                    correctAnswer: 2
                },
                {
                    question: "What is the capital of India?",
                    options: ["Mumbai", "Kolkata", "New Delhi", "Chennai"],
                    correctAnswer: 2
                }
            ]
        }
    ];

    saveQuizzes(samples);
}

// INITIALIZE WEBSITE

document.addEventListener("DOMContentLoaded", function() {
    addSampleQuizzes();
    updateUserUI();
    updateQuizCount();
});
