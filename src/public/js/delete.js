// Fonction pour supprimer un élément avec fetch
async function deleteItem(itemId, itemName, basePath, redirectUrl) {
  // Confirmation
  if (!confirm(`Êtes-vous sûr de vouloir supprimer ${itemName} ?`)) {
    return;
  }

  try {
    // Construire l'URL de suppression
    const deleteUrl = `${basePath}/${itemId}`;

    // Faire la requête DELETE
    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      // Rediriger après suppression réussie
      window.location.href = redirectUrl;
    } else {
      alert('Erreur lors de la suppression');
    }
  } catch (error) {
    console.error('Erreur:', error);
    alert('Erreur lors de la suppression');
  }
}
