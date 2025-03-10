export function displayEspaceDetails(node, contentDiv) {
    const template = document.getElementById('espace-template');
    if (!template) return;
    
    const clone = document.importNode(template.content, true);
    clone.querySelector(".id").textContent = node._id;
    clone.querySelector(".name").textContent = node.name;

    contentDiv.innerHTML = '';
    contentDiv.appendChild(clone);
}
