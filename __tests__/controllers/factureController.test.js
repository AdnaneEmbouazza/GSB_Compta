/**
 * TESTS FACTURE CONTROLLER
 * Test la logique métier: suppression avec restauration du stock
 */

const { deleteFacture } = require('../../src/controllers/factureController');
const db = require('../../src/config/database');

jest.mock('../../src/config/database');

describe('Facture Controller - deleteFacture avec Stock Restoration', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('deleteFacture doit restaurer le stock pour chaque ligne', async () => {
    const req = {
      params: { id: 1 },
      user: { id: 100 }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Simuler: la facture a 2 lignes avec articles de qté 5 et 3
    db.all.mockResolvedValueOnce([
      { quantite: 5, id_article: 10 },
      { quantite: 3, id_article: 11 }
    ]);

    db.run.mockResolvedValue();

    await deleteFacture(req, res);

    // Vérifier qu'on a d'abord récupéré les lignes
    expect(db.all).toHaveBeenCalledWith(
      expect.stringContaining('SELECT quantite, id_article FROM lignes_facture'),
      [1]
    );
  });

  test('deleteFacture doit incrémenter le stock pour chaque article', async () => {
    const req = {
      params: { id: 1 },
      user: { id: 100 }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Lignes avec qté
    db.all.mockResolvedValueOnce([
      { quantite: 5, id_article: 10 },
      { quantite: 3, id_article: 11 }
    ]);

    db.run.mockResolvedValue();

    await deleteFacture(req, res);

    // Vérifier que UPDATE a été appelé pour restaurer le stock
    expect(db.run).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE articles SET quantite_stock = quantite_stock + ?'),
      expect.arrayContaining([5, 10])
    );

    expect(db.run).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE articles SET quantite_stock = quantite_stock + ?'),
      expect.arrayContaining([3, 11])
    );
  });

  test('deleteFacture doit supprimer les lignes avant la facture', async () => {
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

    await deleteFacture(req, res);

    // Vérifier que DELETE lignes_facture est appelé
    expect(db.run).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM lignes_facture WHERE id_facture'),
      [1]
    );
  });

  test('deleteFacture doit supprimer la facture après les lignes', async () => {
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

    await deleteFacture(req, res);

    // Vérifier que DELETE factures est appelé
    expect(db.run).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM factures WHERE id_facture'),
      expect.arrayContaining([1])
    );
  });

  test('deleteFacture doit retourner status 200 en cas de succès', async () => {
    const req = {
      params: { id: 1 },
      user: { id: 100 }
    };

    const res = {
      sendStatus: jest.fn()
    };

    db.all.mockResolvedValueOnce([]);
    db.run.mockResolvedValue();

    await deleteFacture(req, res);

    expect(res.sendStatus).toHaveBeenCalledWith(200);
  });

  test('deleteFacture avec 0 lignes doit toujours supprimer la facture', async () => {
    const req = {
      params: { id: 1 },
      user: { id: 100 }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Facture sans lignes
    db.all.mockResolvedValueOnce([]);
    db.run.mockResolvedValue();

    await deleteFacture(req, res);

    // Doit quand même supprimer la facture
    expect(db.run).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM factures'),
      expect.any(Array)
    );
  });

  test('deleteFacture doit vérifier l\'utilisateur', async () => {
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

    await deleteFacture(req, res);

    // Vérifier que le DELETE inclut le filtre utilisateur
    const deleteCalls = db.run.mock.calls.filter(call => 
      call[0].includes('DELETE FROM factures')
    );
    
    expect(deleteCalls.some(call => call[1].includes(100))).toBe(true);
  });
});
