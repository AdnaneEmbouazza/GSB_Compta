/**
 * TESTS CONTACT CONTROLLER
 * Test la logique métier: création, modification, suppression de contacts
 */

const { updateContact, deleteContact } = require('../../src/controllers/contactController');
const db = require('../../src/config/database');

// Mock la base de données
jest.mock('../../src/config/database');

describe('Contact Controller - updateContact', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('updateContact doit modifier tous les infos du contact', async () => {
    const req = {
      params: { id: 1 },
      user: { id: 100 },
      body: {
        nom_contact: 'Entreprise XYZ',
        type_contact: 'client',
        email_contact: 'contact@xyz.com',
        telephone: '0123456789',
        adresse: '123 Rue de Paris',
        code_postal: '75000',
        ville: 'Paris'
      }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    db.run.mockResolvedValue();

    await updateContact(req, res);

    // Vérifier que UPDATE a été appelé avec les bonnes données
    expect(db.run).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE contacts SET'),
      expect.arrayContaining([
        'Entreprise XYZ',
        'client',
        'contact@xyz.com',
        '0123456789',
        '123 Rue de Paris',
        '75000',
        'Paris',
        1,      // id_contact
        100     // id_utilisateur (sécurité)
      ])
    );
  });

  test('updateContact doit retourner status 200 avec succès', async () => {
    const req = {
      params: { id: 1 },
      user: { id: 100 },
      body: {
        nom_contact: 'Entreprise XYZ',
        type_contact: 'fournisseur',
        email_contact: 'info@xyz.com',
        telephone: '0987654321',
        adresse: '456 Avenue lyonne',
        code_postal: '69000',
        ville: 'Lyon'
      }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    db.run.mockResolvedValue();

    await updateContact(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  test('updateContact doit vérifier la propriété du contact (utilisateur)', async () => {
    const req = {
      params: { id: 1 },
      user: { id: 100 },
      body: {
        nom_contact: 'Test',
        type_contact: 'client',
        email_contact: 'test@test.com',
        telephone: '',
        adresse: '',
        code_postal: '',
        ville: ''
      }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    db.run.mockResolvedValue();

    await updateContact(req, res);

    // Vérifier que la requête SQL contient le filtre id_utilisateur
    expect(db.run).toHaveBeenCalledWith(
      expect.stringContaining('id_utilisateur = ?'),
      expect.arrayContaining([100])
    );
  });

  test('updateContact avec email vide doit fonctionner', async () => {
    const req = {
      params: { id: 1 },
      user: { id: 100 },
      body: {
        nom_contact: 'Entreprise AAA',
        type_contact: 'client',
        email_contact: '',  // Email vide
        telephone: '0111111111',
        adresse: '789 Strada',
        code_postal: '13000',
        ville: 'Marseille'
      }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    db.run.mockResolvedValue();

    await updateContact(req, res);

    // Doit accepter email vide
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });
});

describe('Contact Controller - deleteContact', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('deleteContact doit supprimer le contact', async () => {
    const req = {
      params: { id: 1 },
      user: { id: 100 }
    };

    const res = {
      sendStatus: jest.fn()
    };

    db.run.mockResolvedValue();

    await deleteContact(req, res);

    // Vérifier que DELETE a été appelé
    expect(db.run).toHaveBeenCalledWith(
      'DELETE FROM contacts WHERE id_contact = ? AND id_utilisateur = ?',
      [1, 100]
    );
  });

  test('deleteContact doit retourner status 200', async () => {
    const req = {
      params: { id: 1 },
      user: { id: 100 }
    };

    const res = {
      sendStatus: jest.fn()
    };

    db.run.mockResolvedValue();

    await deleteContact(req, res);

    expect(res.sendStatus).toHaveBeenCalledWith(200);
  });

  test('deleteContact doit vérifier l\'utilisateur propriétaire', async () => {
    const req = {
      params: { id: 5 },
      user: { id: 200 }
    };

    const res = {
      sendStatus: jest.fn()
    };

    db.run.mockResolvedValue();

    await deleteContact(req, res);

    // Vérifier que DELETE inclut le filtre utilisateur
    expect(db.run).toHaveBeenCalledWith(
      expect.stringContaining('id_utilisateur = ?'),
      expect.arrayContaining([200])
    );
  });

  test('deleteContact ne doit pas supprimer les contacts d\'autres utilisateurs', async () => {
    const req = {
      params: { id: 1 },
      user: { id: 100 }  // Utilisateur 100
    };

    const res = {
      sendStatus: jest.fn()
    };

    db.run.mockResolvedValue();

    await deleteContact(req, res);

    // Le WHERE inclut id_utilisateur = 100
    // Donc même si id_contact = 1 existe, si propriétaire != 100, rien n'est supprimé
    expect(db.run).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([1, 100])
    );
  });

  test('deleteContact doit gérer les erreurs', async () => {
    const req = {
      params: { id: 1 },
      user: { id: 100 }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Simuler une erreur BD
    db.run.mockRejectedValue(new Error('BD error'));

    await deleteContact(req, res);

    // Doit retourner une erreur 500
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
