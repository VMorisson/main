export function displayParcDetails(node, contentDiv) {
    const template = document.getElementById('parc-template');
    if (!template) return;
    
    const clone = document.importNode(template.content, true);
    clone.querySelector(".id").textContent = node._id;
    clone.querySelector(".name").textContent = node.name;
    
    const descriptionContainer = clone.querySelector(".description-container");
    if (node.description) {
        clone.querySelector(".description").textContent = node.description;
    } else {
        descriptionContainer.style.display = "none"; // Cache la section si pas de description
    }

    contentDiv.innerHTML = '';
    contentDiv.appendChild(clone);
}