const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');
const Contract = require('../src/models/Contract');
const EmployeeBankAccount = require('../src/models/EmployeeBankAccount');
const PaymentGateway = require('../src/models/PaymentGateway');
const CompanyBankAccount = require('../src/models/CompanyBankAccount');
const { encrypt } = require('../src/services/encryption');

const seedHrmData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Clean existing records
    await Contract.deleteMany({});
    await EmployeeBankAccount.deleteMany({});
    await PaymentGateway.deleteMany({});
    await CompanyBankAccount.deleteMany({});
    console.log('🗑️  Cleared existing contracts, employee bank accounts, company bank accounts, and gateways');

    // 2. Fetch all users
    const users = await User.find({});
    if (users.length === 0) {
      console.log('❌ No users found. Run node seed.js first.');
      process.exit(1);
    }

    const superAdmin = users.find(u => u.role === 'Super CRM Administrator');
    const superAdminId = superAdmin ? superAdmin._id : null;

    // 3. Create active payment gateway (Fawry)
    await PaymentGateway.create({
      provider: 'Fawry',
      isActive: true,
      apiKey: encrypt('mock-api-key'),
      apiSecret: encrypt('mock-api-secret'),
      merchantCode: encrypt('mock-merchant-code'),
      configuredBy: superAdminId,
    });
    console.log('✓ Created active Fawry Payment Gateway');

    // 4. Create Company Bank Account
    const companyAccount = await CompanyBankAccount.create({
      nickname: 'Main Company Account',
      bankName: 'CIB',
      accountName: 'Super CRM Corp',
      accountNumber: encrypt('999888777666'),
      iban: encrypt('EG999998887776665554443332'),
      disbursementProvider: 'Fawry',
      isDefault: true,
      isActive: true,
      configuredBy: superAdminId,
      verifiedBy: superAdminId,
      verifiedAt: new Date(),
    });
    console.log('✓ Created Default Company Bank Account');

    // 5. Create contract and bank account for all users except Super Admin
    let count = 0;
    for (const user of users) {
      if (user.role === 'Super CRM Administrator') continue;

      // Create Contract
      await Contract.create({
        employeeId: user._id,
        baseSalary: 15000,
        netSalary: 12000,
        hireDate: new Date('2025-01-01'),
        contractEndDate: new Date('2027-01-01'),
        govDocs: {
          nationalId: '29901010101014',
          socialInsurance: '12345678',
        },
      });

      // Create Employee Bank Account
      await EmployeeBankAccount.create({
        employeeId: user._id,
        bankName: 'CIB',
        accountName: `${user.firstName} ${user.lastName}`,
        accountNumber: encrypt('123456789012'),
        iban: encrypt('EG12345678901234567890123456'),
        disbursementMethod: 'BankAccount',
        preferredGateway: 'Fawry',
        isVerified: true,
        verifiedBy: superAdminId,
        verifiedAt: new Date(),
        addedBy: superAdminId,
      });

      count++;
    }

    console.log(`\n🎉 Seeded ${count} contracts, bank accounts, gateways, and company accounts successfully!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding HRM data:', error);
    process.exit(1);
  }
};

seedHrmData();
