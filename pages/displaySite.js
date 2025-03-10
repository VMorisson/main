export function displaySiteDetails(node, contentDiv) {
    const template = document.getElementById('site-template');
    if (!template) return;
    
    const clone = document.importNode(template.content, true);
    clone.querySelector(".id").textContent = node._id;
    clone.querySelector(".name").textContent = node.name;
    
    const locationContainer = clone.querySelector(".location-container");
    if (node.location) {
        clone.querySelector(".location").textContent = node.location;
    } else {
        locationContainer.style.display = "none";
    }

    contentDiv.innerHTML = '';
    contentDiv.appendChild(clone);
}
