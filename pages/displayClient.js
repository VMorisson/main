export function displayClientDetails(node, contentDiv) {
    const template = document.getElementById('client-template');
    if (!template) return;
    
    const clone = document.importNode(template.content, true);
    clone.querySelector(".id").textContent = node._id;
    clone.querySelector(".name").textContent = node.name;
    
    const contactContainer = clone.querySelector(".contact-container");
    if (node.contact) {
        clone.querySelector(".contact").textContent = node.contact;
    } else {
        contactContainer.style.display = "none";
    }

    contentDiv.innerHTML = '';
    contentDiv.appendChild(clone);
}
