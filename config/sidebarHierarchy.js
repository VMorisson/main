// sidebarHierarchy.js
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig.js';

let originalHierarchy = [];
let filteredHierarchy = [];
let currentSelectedId = null;

export async function loadParcHierarchy() {
  const container = document.getElementById('parc-content');
  if (!container) return;

  container.innerHTML = '';

  try {
    const res = await fetch('http://localhost:3000/api/hierarchy');
    if (!res.ok) throw new Error('Erreur HTTP ' + res.status);

    originalHierarchy = await res.json();

    const user = auth.currentUser;
    let entreprise = '';

    if (user) {
      entreprise = await getUserEntreprise(user.uid);
    }

    filteredHierarchy = entreprise ? filterByEntreprise(originalHierarchy, entreprise) : originalHierarchy;

    renderList(filteredHierarchy);
    setupSearch();
  } catch (err) {
    container.textContent = 'Erreur de chargement de la hiérarchie.';
  }
}

async function getUserEntreprise(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data().entreprise : '';
  } catch (error) {
    return '';
  }
}

function filterByEntreprise(allParcs, entreprise) {
  console.log('Filtrage par entreprise :', entreprise);
  return allParcs.filter(parc => {
    const integrateurMatch = parc.integrateur === entreprise;
    const parcMatch = parc.name === entreprise;
    const clientMatch = parc.clients?.some(client => client.name === entreprise);

    if (integrateurMatch || parcMatch) {
      console.log('Match trouvé sur parc :', parc.name);
      return true;
    }
    if (parc.clients?.some(client => client.name === entreprise)) {
      parc.clients = parc.clients.filter(client => client.name === entreprise);
      console.log('Client correspondant :', parc.clients);
      return true;
    }
    return false;
  });
}

function renderList(hierarchy, forceOpen = false) {
  const container = document.getElementById('parc-content');
  container.innerHTML = '';
  container.appendChild(buildList(hierarchy, forceOpen));
}

function buildList(nodes, forcedOpen = false, level = 0) {
  const ul = document.createElement('ul');

  nodes.forEach(node => {
    console.log('Construction du noeud :', node.name, 'niveau :', level);
    const li = document.createElement('li');
    li.dataset.id = node._id;

    const link = document.createElement('a');
    link.href = '#';
    link.textContent = node.name;
    link.classList.add(`hierarchy-${['parc', 'client', 'site', 'espace'][level]}`);
    li.appendChild(link);

    const children = [...(node.clients || []), ...(node.sites || []), ...(node.espaces || [])];

    console.log('Enfants trouvés pour', node.name, ':', children);

    if (children.length) {
      li.classList.add('has-children');
      li.appendChild(buildList(children, forcedOpen, level + 1));

      if (forcedOpen || node.fullMatch) li.classList.add('open');
    }

    link.onclick = (e) => {
      e.preventDefault();
      currentSelectedId = node._id;

      // Close other sibling branches
      const siblingNodes = li.parentElement?.children;
      if (siblingNodes) {
        [...siblingNodes].forEach(sibling => {
          if (sibling !== li) sibling.classList.remove('open');
        });
      }

      document.querySelectorAll('#parc-content li').forEach(el => el.classList.remove('selected'));
      li.classList.add('selected');
      li.classList.toggle('open');

      displayContent(node);
    };

    ul.appendChild(li);
  });

  return ul;
}

function setupSearch() {
  const toggleBtn = document.getElementById('search-toggle-btn');
  const searchBar = document.getElementById('search-bar');
  const searchInput = document.getElementById('search-input');

  // Masquer la barre de recherche au début
  searchBar.style.display = 'none';

  // Fonction pour afficher/masquer la barre de recherche
  toggleBtn.onclick = (event) => {
    event.stopPropagation(); // Empêche la fermeture immédiate si on clique sur le bouton
    const isActive = searchBar.style.display === 'block';
    searchBar.style.display = isActive ? 'none' : 'block';

    if (!isActive) {
      searchInput.focus(); // Met le focus sur l'input
    }
  };

  // Fonction pour sauvegarder l'état des branches ouvertes
  function getOpenNodes() {
    return Array.from(document.querySelectorAll('#parc-content li.open')).map(li => li.dataset.id);
  }

  function restoreOpenNodes(openNodes) {
    document.querySelectorAll('#parc-content li').forEach(li => {
      if (openNodes.includes(li.dataset.id)) {
        li.classList.add('open');
      } else {
        li.classList.remove('open');
      }
    });
  }

  // Fermer la barre de recherche si on clique ailleurs, mais garder l'état de l'accordéon
  document.addEventListener("click", (event) => {
    const isSearchBarOpen = searchBar.style.display === "block";
  
    if (!searchBar.contains(event.target) && event.target !== toggleBtn) {
      searchBar.style.display = "none";
      searchInput.value = ""; // Efface la recherche
  
      if (isSearchBarOpen) { // Ne recharge l'arbre que si la barre était ouverte
        const openNodes = getOpenNodes(); // Sauvegarde l'état actuel des branches ouvertes
        renderList(filteredHierarchy, false); // Recharge sans forcer l'ouverture
        restoreOpenNodes(openNodes); // Restaure les branches ouvertes
      }
    }
  });

  // Mise à jour des résultats au fil de la saisie
  searchInput.oninput = () => {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) {
      const openNodes = getOpenNodes();
      renderList(filteredHierarchy, false);
      restoreOpenNodes(openNodes);
      return;
    }

    const filtered = filterHierarchyBySearch(filteredHierarchy, query);
    renderList(filtered, true); // Affiche les résultats sans affecter l'état des branches
  };

  // Empêcher la fermeture de la recherche si on clique dans l'accordéon
  document.getElementById('parc-content').addEventListener("click", (event) => {
    event.stopPropagation();
  });
}


function filterHierarchyBySearch(nodes, query) {
  return nodes.reduce((acc, node) => {
    const match = node.name.toLowerCase().includes(query);
    
    // Recursively search in children
    const clients = node.clients ? filterHierarchyBySearch(node.clients, query) : [];
    const sites = node.sites ? filterHierarchyBySearch(node.sites, query) : [];
    const espaces = node.espaces ? filterHierarchyBySearch(node.espaces, query) : [];

    if (match || clients.length || sites.length || espaces.length) {
      acc.push({ 
        ...node, 
        clients: clients.length ? clients : node.clients || [], 
        sites: sites.length ? sites : node.sites || [], 
        espaces: espaces.length ? espaces : node.espaces || [] 
      });
    }

    return acc;
  }, []);
}

function displayContent(node) {
  let type = node.clients ? 'parc' : node.sites ? 'client' : node.espaces ? 'site' : 'espace';
  const template = document.getElementById(`${type}-template`);
  if (!template) return;

  const clone = template.content.cloneNode(true);
  clone.querySelector('.id').textContent = node._id || '';
  clone.querySelector('.name').textContent = node.name || '';
  document.getElementById('dynamic-content').innerHTML = '';
  document.getElementById('dynamic-content').appendChild(clone);
}