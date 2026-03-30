/**
 * TESTS DEVIS CONTROLLER
 * Test la logique métier: suppression avec restauration du stock
 */

const { deleteDevis } = require('../../src/controllers/devisController');
const db = require('../../src/config/database');

jest.mock('../../src/config/database');

describe('Devis Controller - deleteDevis avec Stock Restoration', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('deleteDevis doit restaurer le stock pour chaque ligne', async () => {
    const req = {
      params: { id: 1 },
      user: { id: 100 }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Simuler: le devis a 2 lignes avec articles de qté 2 et 4
    db.all.mockResolvedValueOnce([
      { quantite: 2, id_article: 20 },
      { quantite: 4, id_article: 21 }
    ]);

    db.run.mockResolvedValue();

    await deleteDevis(req, res);

    // Vérifier qu'on a d'abord récupéré les lignes
    expect(db.all).toHaveBeenCalledWith(
      expect.stringContaining('SELECT quantite, id_article FROM lignes_devis'),
      [1]
    );
  });

  test('deleteDevis doit incrémenter le stock pour chaque article', async () => {
    const req = {
      params: { id: 1 },
      user: { id: 100 }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    db.all.mockResolvedValueOnce([
      { quantite: 2, id_article: 20 },
      { quantite: 4, id_article: 21 }
    ]);

    db.run.mockResolvedValue();

    await deleteDevis(req, res);

    // Vérifier restauration stock article 20
    expect(db.run).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE articles SET quantite_stock = quantite_stock + ?'),
      expect.arrayContaining([2, 20])
    );

    // Vérifier restauration stock article 21
    expect(db.run).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE articles SET quantite_stock = quantite_stock + ?'),
      expect.arrayContaining([4, 21])
    );
  });

  test('deleteDevis doit supprimer les lignes avant le devis', async () => {
    const req = {
      params: { id: 1 },
      user: { id: 100 }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    db.all.mockResolvedValueOnce([]);
    db.run.mockResolvedValue();

    await deleteDevis(req, res);

    expect(db.run).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM lignes_devis WHERE id_devis'),
      [1]
    );
  });

  test('deleteDevis doit supprimer le devis après les lignes', async () => {
    const req = {
      params: { id: 1 },
      user: { id: 100 }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    db.all.mockResolvedValueOnce([]);
    db.run.mockResolvedValue();

    await deleteDevis(req, res);

    expect(db.run).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM devis WHERE id_devis'),
      expect.arrayContaining([1])
    );
  });

  test('deleteDevis doit retourner status 200 en cas de succès', async () => {
    const req = {
      params: { id: 1 },
      user: { id: 100 }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    db.all.mockResolvedValueOnce([]);
    db.run.mockResolvedValue();

    await deleteDevis(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('deleteDevis doit vérifier l\'utilisateur', async () => {
    const req = {
      params: { id: 1 },
      user: { id: 100 }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    db.all.mockResolvedValueOnce([]);
    db.run.mockResolvedValue();

    await deleteDevis(req, res);

    // Vérifier que le DELETE inclut le filtre utilisateur
    const deleteCalls = db.run.mock.calls.filter(call => 
      call[0].includes('DELETE FROM devis')
    );
    
    expect(deleteCalls.some(call => call[1].includes(100))).toBe(true);
  });

  test('deleteDevis avec multiple articles doit restaurer chacun', async () => {
    const req = {
      params: { id: 5 },
      user: { id: 100 }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Devis avec 3 articles
    db.all.mockResolvedValueOnce([
      { quantite: 1, id_article: 10 },
      { quantite: 2, id_article: 11 },
      { quantite: 3, id_article: 12 }
    ]);

    db.run.mockResolvedValue();

    await deleteDevis(req, res);

    // Vérifier que 3 UPDATE de stock ont été faits
    const updateStockCalls = db.run.mock.calls.filter(call =>
      call[0].includes('UPDATE articles SET quantite_stock = quantite_stock + ?')
    );

    expect(updateStockCalls).toHaveLength(3);
  });
});
