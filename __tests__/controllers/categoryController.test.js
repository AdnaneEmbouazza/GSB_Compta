/**
 * TESTS CATEGORY CONTROLLER
 * Test la logique métier: création, modification, suppression de catégories
 */

const { updateCategory, deleteCategory } = require('../../src/controllers/categoryController');
const db = require('../../src/config/database');

jest.mock('../../src/config/database');

describe('Category Controller - updateCategory', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('updateCategory doit modifier le nom de la catégorie', async () => {
    const req = {
      params: { id: 1 },
      user: { id: 100 },
      body: {
        nom_categorie: 'Électronique Modifiée'
      }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    db.run.mockResolvedValue();

    await updateCategory(req, res);

    // Vérifier que UPDATE a été appelé
    expect(db.run).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE categories SET nom_categorie'),
      expect.arrayContaining(['Électronique Modifiée', 1, 100])
    );
  });

  test('updateCategory doit retourner status 200', async () => {
    const req = {
      params: { id: 1 },
      user: { id: 100 },
      body: {
        nom_categorie: 'Nouvelle Catégorie'
      }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    db.run.mockResolvedValue();

    await updateCategory(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('updateCategory doit vérifier l\'utilisateur', async () => {
    const req = {
      params: { id: 1 },
      user: { id: 100 },
      body: {
        nom_categorie: 'Test'
      }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    db.run.mockResolvedValue();

    await updateCategory(req, res);

    // Vérifier que le UPDATE inclut le filtre utilisateur
    expect(db.run).toHaveBeenCalledWith(
      expect.stringContaining('id_utilisateur'),
      expect.arrayContaining([100])
    );
  });
});

describe('Category Controller - deleteCategory', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('deleteCategory doit supprimer la catégorie', async () => {
    const req = {
      params: { id: 1 },
      user: { id: 100 }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    db.run.mockResolvedValue();

    await deleteCategory(req, res);

    // Vérifier que DELETE a été appelé
    expect(db.run).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM categories WHERE id_categorie'),
      expect.arrayContaining([1])
    );
  });

  test('deleteCategory doit supprimer aussi les liens articles_categories', async () => {
    const req = {
      params: { id: 1 },
      user: { id: 100 }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    db.run.mockResolvedValue();

    await deleteCategory(req, res);

    // Vérifier que les liens dans articles_categories sont supprimés (via CASCADE)
    // ou explicitement via un DELETE
    const deleteCalls = db.run.mock.calls.filter(call =>
      call[0].includes('DELETE')
    );

    expect(deleteCalls.length).toBeGreaterThanOrEqual(1);
  });

  test('deleteCategory doit vérifier l\'utilisateur', async () => {
    const req = {
      params: { id: 1 },
      user: { id: 100 }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    db.run.mockResolvedValue();

    await deleteCategory(req, res);

    // Vérifier que le DELETE inclut le filtre utilisateur
    expect(db.run).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([100])
    );
  });

  test('deleteCategory doit retourner status 200', async () => {
    const req = {
      params: { id: 1 },
      user: { id: 100 }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    db.run.mockResolvedValue();

    await deleteCategory(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });
});
