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

    // Vérifier que UPDATE a été appelé (les catégories sont globales, pas liées à l'utilisateur)
    expect(db.run).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE categories SET nom_categorie'),
      expect.arrayContaining(['Électronique Modifiée', 1])
    );
  });

  test('updateCategory doit retourner status 200 avec succès', async () => {
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
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
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
      sendStatus: jest.fn()
    };

    db.run.mockResolvedValue();

    await deleteCategory(req, res);

    // Vérifier que DELETE a été appelé
    expect(db.run).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM categories WHERE id_categorie'),
      [1]
    );
  });

  test('deleteCategory doit retourner status 200', async () => {
    const req = {
      params: { id: 1 },
      user: { id: 100 }
    };

    const res = {
      sendStatus: jest.fn()
    };

    db.run.mockResolvedValue();

    await deleteCategory(req, res);

    // Vérifier que sendStatus(200) a été appelé
    expect(res.sendStatus).toHaveBeenCalledWith(200);
  });

  test('deleteCategory avec id différent doit fonctionner', async () => {
    const req = {
      params: { id: 5 },
      user: { id: 100 }
    };

    const res = {
      sendStatus: jest.fn()
    };

    db.run.mockResolvedValue();

    await deleteCategory(req, res);

    // Vérifier que DELETE a été appelé avec le bon id
    expect(db.run).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM categories'),
      [5]
    );
  });


});
