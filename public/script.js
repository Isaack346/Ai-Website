// Ensure main content appears only after animation completes
document.addEventListener("DOMContentLoaded", function () {
    setTimeout(() => {
        document.querySelector(".opening-animation").style.display = "none";
        document.getElementById("main-content").style.display = "block";
        document.getElementById("main-content").style.opacity = "1";
    }, 5000); // Match animation duration
});

// Function to toggle chatbot visibility
function toggleChatbot() {
    let chatbot = document.getElementById("chatbot");
    chatbot.style.display = chatbot.style.display === "none" ? "flex" : "none";
}

// Function to handle chatbot message sending
function sendMessage() {
    let userInput = document.getElementById("userInput").value;
    if (userInput.trim() === "") return;

    let chatBody = document.getElementById("chatBody");
    let userMessage = `<div class='message user-message'>${userInput}</div>`;
    chatBody.innerHTML += userMessage;
    document.getElementById("userInput").value = "";
    chatBody.scrollTop = chatBody.scrollHeight;

    // Fetch response from backend
    fetch(`http://127.0.0.1:5000/chatbot-response?query=${encodeURIComponent(userInput)}`)
        .then(response => response.json())
        .then(data => {
            if (data.response) {
                let botMessage = `<div class='message bot-message'>${data.response}</div>`;
                chatBody.innerHTML += botMessage;
            } else {
                let errorMessage = `<div class='message bot-message'>Sorry, I couldn't process your request.</div>`;
                chatBody.innerHTML += errorMessage;
            }
            chatBody.scrollTop = chatBody.scrollHeight;
        })
        .catch(error => {
            let errorMessage = `<div class='message bot-message'>Error processing your request.</div>`;
            chatBody.innerHTML += errorMessage;
        });
}
