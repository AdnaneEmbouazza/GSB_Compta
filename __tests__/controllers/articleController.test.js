/**
 * TESTS ARTICLE CONTROLLER
 * Test la logique métier: création, modification, suppression d'articles et catégories
 */

const { updateArticle, deleteArticle } = require('../../src/controllers/articleController');
const db = require('../../src/config/database');

// Mock la base de données
jest.mock('../../src/config/database');

describe('Article Controller - updateArticle', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('updateArticle doit supprimer les anciennes catégories', async () => {
    const req = {
      params: { id: 1 },
      user: { id: 100 },
      body: {
        nom_article: 'Article Modifié',
        description: 'Description',
        prix_unitaire: '19.99',
        quantite_stock: '10',
        categories: ['2', '5']
      }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    db.run.mockResolvedValue();

    await updateArticle(req, res);

    // Vérifier que DELETE a été appelé pour supprimer les anciennes associations
    expect(db.run).toHaveBeenCalledWith(
      'DELETE FROM articles_categories WHERE id_article = ?',
      [1]
    );
  });

  test('updateArticle doit insérer les nouvelles catégories cochées', async () => {
    const req = {
      params: { id: 1 },
      user: { id: 100 },
      body: {
        nom_article: 'Article Modifié',
        description: 'Description',
        prix_unitaire: '19.99',
        quantite_stock: '10',
        categories: ['2', '5']
      }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    db.run.mockResolvedValue();

    await updateArticle(req, res);

    // Vérifier que INSERT a été appelé pour chaque catégorie cochée
    expect(db.run).toHaveBeenCalledWith(
      'INSERT INTO articles_categories (id_article, id_categorie) VALUES (?, ?)',
      [1, '2']
    );
    
    expect(db.run).toHaveBeenCalledWith(
      'INSERT INTO articles_categories (id_article, id_categorie) VALUES (?, ?)',
      [1, '5']
    );
  });

  test('updateArticle doit mettre à jour les infos de l\'article', async () => {
    const req = {
      params: { id: 1 },
      user: { id: 100 },
      body: {
        nom_article: 'Article Modifié',
        description: 'Nouvelle description',
        prix_unitaire: '29.99',
        quantite_stock: '20',
        categories: []
      }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    db.run.mockResolvedValue();

    await updateArticle(req, res);

    // Vérifier que UPDATE a été appelé avec les bonnes données
    expect(db.run).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE articles SET'),
      expect.arrayContaining(['Article Modifié', 'Nouvelle description', 29.99, 20, 1, 100])
    );
  });

  test('updateArticle doit retourner status 200 avec message de succès', async () => {
    const req = {
      params: { id: 1 },
      user: { id: 100 },
      body: {
        nom_article: 'Article Modifié',
        description: '',
        prix_unitaire: '19.99',
        quantite_stock: '10',
        categories: []
      }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    db.run.mockResolvedValue();

    await updateArticle(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  test('updateArticle avec catégories vides doit ne pas insérer de liens', async () => {
    const req = {
      params: { id: 1 },
      user: { id: 100 },
      body: {
        nom_article: 'Article Modifié',
        description: '',
        prix_unitaire: '19.99',
        quantite_stock: '10',
        categories: []
      }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    db.run.mockResolvedValue();

    await updateArticle(req, res);

    // Vérifier que aucun INSERT ne s'est produit
    const insertCalls = db.run.mock.calls.filter(call => 
      call[0].includes('INSERT INTO articles_categories')
    );
    expect(insertCalls).toHaveLength(0);
  });
});

describe('Article Controller - deleteArticle', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('deleteArticle doit supprimer l\'article', async () => {
    const req = {
      params: { id: 1 },
      user: { id: 100 }
    };

    const res = {
      sendStatus: jest.fn()
    };

    db.run.mockResolvedValue();

    await deleteArticle(req, res);

    // Vérifier que DELETE a été appelé
    expect(db.run).toHaveBeenCalledWith(
      'DELETE FROM articles WHERE id_article = ? AND id_utilisateur = ?',
      [1, 100]
    );
  });

  test('deleteArticle doit retourner status 200', async () => {
    const req = {
      params: { id: 1 },
      user: { id: 100 }
    };

    const res = {
      sendStatus: jest.fn()
    };

    db.run.mockResolvedValue();

    await deleteArticle(req, res);

    expect(res.sendStatus).toHaveBeenCalledWith(200);
  });

  test('deleteArticle doit vérifier l\'utilisateur', async () => {
    const req = {
      params: { id: 1 },
      user: { id: 100 }
    };

    const res = {
      sendStatus: jest.fn()
    };

    db.run.mockResolvedValue();

    await deleteArticle(req, res);

    // Vérifier que la suppression inclut le filtre utilisateur
    expect(db.run).toHaveBeenCalledWith(
      expect.stringContaining('id_utilisateur = ?'),
      expect.arrayContaining([100])
    );
  });
});
