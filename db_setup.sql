-- ============================================================
-- PAYROLL SYSTEM — Database Setup Script
-- Run this once on the target SQL Server database
-- Naming convention: dbo.payroll_[table]  /  dbo.payroll_[table]_sp
-- ============================================================

-- ── 1. EMPLOYEE ──────────────────────────────────────────────
CREATE TABLE dbo.payroll_employee (
    id             INT IDENTITY(1,1) PRIMARY KEY,
    emp_id         NVARCHAR(20)    NOT NULL,
    initial        NVARCHAR(10),
    firstName      NVARCHAR(100),
    midName        NVARCHAR(100),
    surName        NVARCHAR(100),
    nic            NVARCHAR(20),
    dob            DATE,
    address        NVARCHAR(500),
    title          NVARCHAR(200),
    designation    NVARCHAR(200),
    dateOfJoining  DATE,
    category       NVARCHAR(100),
    employmentType NVARCHAR(50),
    position       NVARCHAR(100),
    level          NVARCHAR(50),
    basicSalary    DECIMAL(18,2),
    taxMode        NVARCHAR(50),
    epfEtf         BIT             DEFAULT 1,
    bank           NVARCHAR(100),
    branch         NVARCHAR(100),
    accountNum     NVARCHAR(50),
    status         NVARCHAR(20)    DEFAULT 'Active',
    createdAt      DATETIME        DEFAULT GETDATE()
);
GO

CREATE OR ALTER PROCEDURE dbo.payroll_employee_sp
    @action        NVARCHAR(10),
    @id            INT           = NULL,
    @emp_id        NVARCHAR(20)  = NULL,
    @initial       NVARCHAR(10)  = NULL,
    @firstName     NVARCHAR(100) = NULL,
    @midName       NVARCHAR(100) = NULL,
    @surName       NVARCHAR(100) = NULL,
    @nic           NVARCHAR(20)  = NULL,
    @dob           DATE          = NULL,
    @address       NVARCHAR(500) = NULL,
    @title         NVARCHAR(200) = NULL,
    @designation   NVARCHAR(200) = NULL,
    @dateOfJoining DATE          = NULL,
    @category      NVARCHAR(100) = NULL,
    @employmentType NVARCHAR(50) = NULL,
    @position      NVARCHAR(100) = NULL,
    @level         NVARCHAR(50)  = NULL,
    @basicSalary   DECIMAL(18,2) = NULL,
    @taxMode       NVARCHAR(50)  = NULL,
    @epfEtf        BIT           = NULL,
    @bank          NVARCHAR(100) = NULL,
    @branch        NVARCHAR(100) = NULL,
    @accountNum    NVARCHAR(50)  = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @action = 'INSERT'
        INSERT INTO dbo.payroll_employee
            (emp_id,initial,firstName,midName,surName,nic,dob,address,title,designation,
             dateOfJoining,category,employmentType,position,level,basicSalary,taxMode,epfEtf,bank,branch,accountNum)
        VALUES
            (@emp_id,@initial,@firstName,@midName,@surName,@nic,@dob,@address,@title,@designation,
             @dateOfJoining,@category,@employmentType,@position,@level,@basicSalary,@taxMode,@epfEtf,@bank,@branch,@accountNum);
    ELSE IF @action = 'UPDATE'
        UPDATE dbo.payroll_employee SET
            emp_id=@emp_id, initial=@initial, firstName=@firstName, midName=@midName, surName=@surName,
            nic=@nic, dob=@dob, address=@address, title=@title, designation=@designation,
            dateOfJoining=@dateOfJoining, category=@category, employmentType=@employmentType,
            position=@position, level=@level, basicSalary=@basicSalary, taxMode=@taxMode, epfEtf=@epfEtf,
            bank=@bank, branch=@branch, accountNum=@accountNum
        WHERE id=@id;
    ELSE IF @action = 'DELETE'
        UPDATE dbo.payroll_employee SET status='Deleted' WHERE id=@id;
    SELECT @@ROWCOUNT AS affected;
END
GO

-- ── 2. LEVEL ─────────────────────────────────────────────────
CREATE TABLE dbo.payroll_level (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    name        NVARCHAR(100) NOT NULL,
    description NVARCHAR(500),
    status      NVARCHAR(20)  DEFAULT 'Active',
    createdAt   DATETIME      DEFAULT GETDATE()
);
GO

CREATE OR ALTER PROCEDURE dbo.payroll_level_sp
    @action      NVARCHAR(10),
    @id          INT           = NULL,
    @name        NVARCHAR(100) = NULL,
    @description NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @action = 'INSERT'
        INSERT INTO dbo.payroll_level (name, description) VALUES (@name, @description);
    ELSE IF @action = 'UPDATE'
        UPDATE dbo.payroll_level SET name=@name, description=@description WHERE id=@id;
    ELSE IF @action = 'DELETE'
        UPDATE dbo.payroll_level SET status='Deleted' WHERE id=@id;
    SELECT @@ROWCOUNT AS affected;
END
GO

-- ── 3. POSITION ──────────────────────────────────────────────
CREATE TABLE dbo.payroll_position (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    name        NVARCHAR(100) NOT NULL,
    description NVARCHAR(500),
    status      NVARCHAR(20)  DEFAULT 'Active',
    createdAt   DATETIME      DEFAULT GETDATE()
);
GO

CREATE OR ALTER PROCEDURE dbo.payroll_position_sp
    @action      NVARCHAR(10),
    @id          INT           = NULL,
    @name        NVARCHAR(100) = NULL,
    @description NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @action = 'INSERT'
        INSERT INTO dbo.payroll_position (name, description) VALUES (@name, @description);
    ELSE IF @action = 'UPDATE'
        UPDATE dbo.payroll_position SET name=@name, description=@description WHERE id=@id;
    ELSE IF @action = 'DELETE'
        UPDATE dbo.payroll_position SET status='Deleted' WHERE id=@id;
    SELECT @@ROWCOUNT AS affected;
END
GO

-- ── 4. SALARY COMPONENT ──────────────────────────────────────
CREATE TABLE dbo.payroll_salary_component (
    id             INT IDENTITY(1,1) PRIMARY KEY,
    name           NVARCHAR(200) NOT NULL,
    type           NVARCHAR(50),
    calcType       NVARCHAR(100),
    defaultValue   DECIMAL(18,4),
    formula        NVARCHAR(500),
    effectiveDate  DATE,
    taxable        BIT DEFAULT 0,
    epfApplicable  BIT DEFAULT 0,
    etfApplicable  BIT DEFAULT 0,
    mandatory      BIT DEFAULT 0,
    status         NVARCHAR(20) DEFAULT 'Active',
    createdAt      DATETIME     DEFAULT GETDATE()
);
GO

CREATE OR ALTER PROCEDURE dbo.payroll_salary_component_sp
    @action        NVARCHAR(10),
    @id            INT           = NULL,
    @name          NVARCHAR(200) = NULL,
    @type          NVARCHAR(50)  = NULL,
    @calcType      NVARCHAR(100) = NULL,
    @defaultValue  DECIMAL(18,4) = NULL,
    @formula       NVARCHAR(500) = NULL,
    @effectiveDate DATE          = NULL,
    @taxable       BIT           = 0,
    @epfApplicable BIT           = 0,
    @etfApplicable BIT           = 0,
    @mandatory     BIT           = 0
AS
BEGIN
    SET NOCOUNT ON;
    IF @action = 'INSERT'
        INSERT INTO dbo.payroll_salary_component
            (name,type,calcType,defaultValue,formula,effectiveDate,taxable,epfApplicable,etfApplicable,mandatory)
        VALUES (@name,@type,@calcType,@defaultValue,@formula,@effectiveDate,@taxable,@epfApplicable,@etfApplicable,@mandatory);
    ELSE IF @action = 'UPDATE'
        UPDATE dbo.payroll_salary_component SET
            name=@name, type=@type, calcType=@calcType, defaultValue=@defaultValue, formula=@formula,
            effectiveDate=@effectiveDate, taxable=@taxable, epfApplicable=@epfApplicable,
            etfApplicable=@etfApplicable, mandatory=@mandatory
        WHERE id=@id;
    ELSE IF @action = 'DELETE'
        UPDATE dbo.payroll_salary_component SET status='Deleted' WHERE id=@id;
    SELECT @@ROWCOUNT AS affected;
END
GO

-- ── 5. SALARY STRUCTURE (per-employee component assignments) ─
CREATE TABLE dbo.payroll_salary_structure (
    id             INT IDENTITY(1,1) PRIMARY KEY,
    emp_id         NVARCHAR(20)  NOT NULL,
    componentName  NVARCHAR(200),
    type           NVARCHAR(50),
    calcType       NVARCHAR(100),
    value          DECIMAL(18,4),
    effectiveFrom  DATE,
    taxable        BIT DEFAULT 0,
    epfApplicable  BIT DEFAULT 0,
    etfApplicable  BIT DEFAULT 0,
    status         NVARCHAR(20) DEFAULT 'Active',
    createdAt      DATETIME     DEFAULT GETDATE()
);
GO

CREATE OR ALTER PROCEDURE dbo.payroll_salary_structure_sp
    @action        NVARCHAR(10),
    @id            INT           = NULL,
    @emp_id        NVARCHAR(20)  = NULL,
    @componentName NVARCHAR(200) = NULL,
    @type          NVARCHAR(50)  = NULL,
    @calcType      NVARCHAR(100) = NULL,
    @value         DECIMAL(18,4) = NULL,
    @effectiveFrom DATE          = NULL,
    @taxable       BIT           = 0,
    @epfApplicable BIT           = 0,
    @etfApplicable BIT           = 0
AS
BEGIN
    SET NOCOUNT ON;
    IF @action = 'INSERT'
        INSERT INTO dbo.payroll_salary_structure
            (emp_id,componentName,type,calcType,value,effectiveFrom,taxable,epfApplicable,etfApplicable)
        VALUES (@emp_id,@componentName,@type,@calcType,@value,@effectiveFrom,@taxable,@epfApplicable,@etfApplicable);
    ELSE IF @action = 'UPDATE'
        UPDATE dbo.payroll_salary_structure SET
            componentName=@componentName, type=@type, calcType=@calcType, value=@value,
            effectiveFrom=@effectiveFrom, taxable=@taxable, epfApplicable=@epfApplicable, etfApplicable=@etfApplicable
        WHERE id=@id;
    ELSE IF @action = 'DELETE'
        UPDATE dbo.payroll_salary_structure SET status='Deleted' WHERE id=@id;
    SELECT @@ROWCOUNT AS affected;
END
GO

-- ── 6. LEAVE TYPE ────────────────────────────────────────────
CREATE TABLE dbo.payroll_leave_type (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    name          NVARCHAR(100) NOT NULL,
    annualLimit   INT           DEFAULT 0,
    paid          BIT           DEFAULT 1,
    carryForward  BIT           DEFAULT 0,
    affectsSalary BIT           DEFAULT 0,
    status        NVARCHAR(20)  DEFAULT 'Active',
    createdAt     DATETIME      DEFAULT GETDATE()
);
GO

CREATE OR ALTER PROCEDURE dbo.payroll_leave_type_sp
    @action        NVARCHAR(10),
    @id            INT           = NULL,
    @name          NVARCHAR(100) = NULL,
    @annualLimit   INT           = 0,
    @paid          BIT           = 1,
    @carryForward  BIT           = 0,
    @affectsSalary BIT           = 0
AS
BEGIN
    SET NOCOUNT ON;
    IF @action = 'INSERT'
        INSERT INTO dbo.payroll_leave_type (name,annualLimit,paid,carryForward,affectsSalary)
        VALUES (@name,@annualLimit,@paid,@carryForward,@affectsSalary);
    ELSE IF @action = 'UPDATE'
        UPDATE dbo.payroll_leave_type SET
            name=@name, annualLimit=@annualLimit, paid=@paid, carryForward=@carryForward, affectsSalary=@affectsSalary
        WHERE id=@id;
    ELSE IF @action = 'DELETE'
        UPDATE dbo.payroll_leave_type SET status='Deleted' WHERE id=@id;
    SELECT @@ROWCOUNT AS affected;
END
GO

-- ── 7. LEAVE TRACKING ────────────────────────────────────────
CREATE TABLE dbo.payroll_leave (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    emp_id        NVARCHAR(20)  NOT NULL,
    leaveType     NVARCHAR(100),
    dateFrom      DATE,
    dateTo        DATE,
    days          INT,
    reason        NVARCHAR(500),
    status        NVARCHAR(20)  DEFAULT 'Pending',
    noPayDeducted BIT           DEFAULT 0,
    createdAt     DATETIME      DEFAULT GETDATE()
);
GO

CREATE OR ALTER PROCEDURE dbo.payroll_leave_sp
    @action    NVARCHAR(10),
    @id        INT           = NULL,
    @emp_id    NVARCHAR(20)  = NULL,
    @leaveType NVARCHAR(100) = NULL,
    @dateFrom  DATE          = NULL,
    @dateTo    DATE          = NULL,
    @days      INT           = NULL,
    @reason    NVARCHAR(500) = NULL,
    @status    NVARCHAR(20)  = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @action = 'INSERT'
        INSERT INTO dbo.payroll_leave (emp_id,leaveType,dateFrom,dateTo,days,reason)
        VALUES (@emp_id,@leaveType,@dateFrom,@dateTo,@days,@reason);
    ELSE IF @action = 'STATUS'
        UPDATE dbo.payroll_leave SET status=@status WHERE id=@id;
    ELSE IF @action = 'DELETE'
        DELETE FROM dbo.payroll_leave WHERE id=@id;
    SELECT @@ROWCOUNT AS affected;
END
GO

-- ── 8. LOAN TYPE ─────────────────────────────────────────────
CREATE TABLE dbo.payroll_loan_type (
    id                INT IDENTITY(1,1) PRIMARY KEY,
    name              NVARCHAR(100) NOT NULL,
    interestRate      DECIMAL(5,2)  DEFAULT 0,
    maxAmount         DECIMAL(18,2),
    installmentMethod NVARCHAR(50),
    linkedComponent   NVARCHAR(200),
    status            NVARCHAR(20)  DEFAULT 'Active',
    createdAt         DATETIME      DEFAULT GETDATE()
);
GO

CREATE OR ALTER PROCEDURE dbo.payroll_loan_type_sp
    @action            NVARCHAR(10),
    @id                INT           = NULL,
    @name              NVARCHAR(100) = NULL,
    @interestRate      DECIMAL(5,2)  = 0,
    @maxAmount         DECIMAL(18,2) = NULL,
    @installmentMethod NVARCHAR(50)  = NULL,
    @linkedComponent   NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @action = 'INSERT'
        INSERT INTO dbo.payroll_loan_type (name,interestRate,maxAmount,installmentMethod,linkedComponent)
        VALUES (@name,@interestRate,@maxAmount,@installmentMethod,@linkedComponent);
    ELSE IF @action = 'UPDATE'
        UPDATE dbo.payroll_loan_type SET
            name=@name, interestRate=@interestRate, maxAmount=@maxAmount,
            installmentMethod=@installmentMethod, linkedComponent=@linkedComponent
        WHERE id=@id;
    ELSE IF @action = 'DELETE'
        UPDATE dbo.payroll_loan_type SET status='Deleted' WHERE id=@id;
    SELECT @@ROWCOUNT AS affected;
END
GO

-- ── 9. EMPLOYEE LOAN ─────────────────────────────────────────
CREATE TABLE dbo.payroll_loan (
    id                 INT IDENTITY(1,1) PRIMARY KEY,
    emp_id             NVARCHAR(20)  NOT NULL,
    loanTypeId         INT,
    loanType           NVARCHAR(100),
    principal          DECIMAL(18,2),
    interestRate       DECIMAL(5,2),
    totalPayable       DECIMAL(18,2),
    installments       INT,
    monthlyInstallment DECIMAL(18,2),
    remaining          DECIMAL(18,2),
    startDate          DATE,
    status             NVARCHAR(20)  DEFAULT 'Active',
    createdAt          DATETIME      DEFAULT GETDATE()
);
GO

CREATE OR ALTER PROCEDURE dbo.payroll_loan_sp
    @action             NVARCHAR(10),
    @id                 INT           = NULL,
    @emp_id             NVARCHAR(20)  = NULL,
    @loanTypeId         INT           = NULL,
    @loanType           NVARCHAR(100) = NULL,
    @principal          DECIMAL(18,2) = NULL,
    @interestRate       DECIMAL(5,2)  = NULL,
    @totalPayable       DECIMAL(18,2) = NULL,
    @installments       INT           = NULL,
    @monthlyInstallment DECIMAL(18,2) = NULL,
    @remaining          DECIMAL(18,2) = NULL,
    @startDate          DATE          = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @action = 'INSERT'
        INSERT INTO dbo.payroll_loan
            (emp_id,loanTypeId,loanType,principal,interestRate,totalPayable,installments,monthlyInstallment,remaining,startDate)
        VALUES (@emp_id,@loanTypeId,@loanType,@principal,@interestRate,@totalPayable,@installments,@monthlyInstallment,@remaining,@startDate);
    ELSE IF @action = 'CLOSE'
        UPDATE dbo.payroll_loan SET status='Closed' WHERE id=@id;
    SELECT @@ROWCOUNT AS affected;
END
GO

-- ── 10. BANK ACCOUNT ─────────────────────────────────────────
CREATE TABLE dbo.payroll_bank_account (
    id         INT IDENTITY(1,1) PRIMARY KEY,
    emp_id     NVARCHAR(20)  NOT NULL,
    bank       NVARCHAR(100),
    branch     NVARCHAR(100),
    accountNum NVARCHAR(50),
    splitType  NVARCHAR(20),
    splitValue DECIMAL(10,2),
    isDefault  BIT           DEFAULT 0,
    priority   INT           DEFAULT 1,
    status     NVARCHAR(20)  DEFAULT 'Active',
    createdAt  DATETIME      DEFAULT GETDATE()
);
GO

CREATE OR ALTER PROCEDURE dbo.payroll_bank_account_sp
    @action     NVARCHAR(10),
    @id         INT           = NULL,
    @emp_id     NVARCHAR(20)  = NULL,
    @bank       NVARCHAR(100) = NULL,
    @branch     NVARCHAR(100) = NULL,
    @accountNum NVARCHAR(50)  = NULL,
    @splitType  NVARCHAR(20)  = NULL,
    @splitValue DECIMAL(10,2) = NULL,
    @isDefault  BIT           = 0
AS
BEGIN
    SET NOCOUNT ON;
    IF @action = 'INSERT'
        INSERT INTO dbo.payroll_bank_account (emp_id,bank,branch,accountNum,splitType,splitValue,isDefault)
        VALUES (@emp_id,@bank,@branch,@accountNum,@splitType,@splitValue,@isDefault);
    ELSE IF @action = 'UPDATE'
        UPDATE dbo.payroll_bank_account SET
            bank=@bank, branch=@branch, accountNum=@accountNum,
            splitType=@splitType, splitValue=@splitValue, isDefault=@isDefault
        WHERE id=@id;
    ELSE IF @action = 'DELETE'
        UPDATE dbo.payroll_bank_account SET status='Deleted' WHERE id=@id;
    SELECT @@ROWCOUNT AS affected;
END
GO

-- ── 11. STANDING ORDER ───────────────────────────────────────
CREATE TABLE dbo.payroll_standing_order (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    emp_id        NVARCHAR(20)  NOT NULL,
    description   NVARCHAR(200),
    type          NVARCHAR(20),
    amount        DECIMAL(18,2),
    effectiveFrom DATE,
    status        NVARCHAR(20)  DEFAULT 'Active',
    createdAt     DATETIME      DEFAULT GETDATE()
);
GO

CREATE OR ALTER PROCEDURE dbo.payroll_standing_order_sp
    @action        NVARCHAR(10),
    @id            INT           = NULL,
    @emp_id        NVARCHAR(20)  = NULL,
    @description   NVARCHAR(200) = NULL,
    @type          NVARCHAR(20)  = NULL,
    @amount        DECIMAL(18,2) = NULL,
    @effectiveFrom DATE          = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @action = 'INSERT'
        INSERT INTO dbo.payroll_standing_order (emp_id,description,type,amount,effectiveFrom)
        VALUES (@emp_id,@description,@type,@amount,@effectiveFrom);
    ELSE IF @action = 'UPDATE'
        UPDATE dbo.payroll_standing_order SET
            description=@description, type=@type, amount=@amount, effectiveFrom=@effectiveFrom
        WHERE id=@id;
    ELSE IF @action = 'DELETE'
        UPDATE dbo.payroll_standing_order SET status='Deleted' WHERE id=@id;
    SELECT @@ROWCOUNT AS affected;
END
GO

-- ── 12. OT CONFIGURATION ─────────────────────────────────────
CREATE TABLE dbo.payroll_ot_config (
    id           INT IDENTITY(1,1) PRIMARY KEY,
    name         NVARCHAR(100) NOT NULL,
    multiplier   DECIMAL(5,2),
    hourDivision INT           DEFAULT 240,
    baseFormula  NVARCHAR(50),
    status       NVARCHAR(20)  DEFAULT 'Active',
    createdAt    DATETIME      DEFAULT GETDATE()
);
GO

CREATE OR ALTER PROCEDURE dbo.payroll_ot_config_sp
    @action       NVARCHAR(10),
    @id           INT           = NULL,
    @name         NVARCHAR(100) = NULL,
    @multiplier   DECIMAL(5,2)  = NULL,
    @hourDivision INT           = 240,
    @baseFormula  NVARCHAR(50)  = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @action = 'INSERT'
        INSERT INTO dbo.payroll_ot_config (name,multiplier,hourDivision,baseFormula)
        VALUES (@name,@multiplier,@hourDivision,@baseFormula);
    ELSE IF @action = 'UPDATE'
        UPDATE dbo.payroll_ot_config SET
            name=@name, multiplier=@multiplier, hourDivision=@hourDivision, baseFormula=@baseFormula
        WHERE id=@id;
    ELSE IF @action = 'DELETE'
        UPDATE dbo.payroll_ot_config SET status='Deleted' WHERE id=@id;
    SELECT @@ROWCOUNT AS affected;
END
GO

-- ── 13. EPF/ETF CONFIGURATION ────────────────────────────────
CREATE TABLE dbo.payroll_epfetf_config (
    id                      INT IDENTITY(1,1) PRIMARY KEY,
    employeeContribution     DECIMAL(5,2) DEFAULT 8,
    employerContributionEPF  DECIMAL(5,2) DEFAULT 12,
    employerContributionETF  DECIMAL(5,2) DEFAULT 3,
    appliesTo                NVARCHAR(50) DEFAULT 'All',
    enabled                  BIT          DEFAULT 1,
    updatedAt                DATETIME     DEFAULT GETDATE()
);
GO

-- Seed with defaults
INSERT INTO dbo.payroll_epfetf_config DEFAULT VALUES;
GO

CREATE OR ALTER PROCEDURE dbo.payroll_epfetf_config_sp
    @action                  NVARCHAR(10),
    @employeeContribution    DECIMAL(5,2) = NULL,
    @employerContributionEPF DECIMAL(5,2) = NULL,
    @employerContributionETF DECIMAL(5,2) = NULL,
    @appliesTo               NVARCHAR(50) = NULL,
    @enabled                 BIT          = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @action = 'UPSERT'
    BEGIN
        IF EXISTS (SELECT 1 FROM dbo.payroll_epfetf_config)
            UPDATE dbo.payroll_epfetf_config SET
                employeeContribution=@employeeContribution,
                employerContributionEPF=@employerContributionEPF,
                employerContributionETF=@employerContributionETF,
                appliesTo=@appliesTo, enabled=@enabled, updatedAt=GETDATE()
            WHERE id = (SELECT TOP 1 id FROM dbo.payroll_epfetf_config ORDER BY id DESC);
        ELSE
            INSERT INTO dbo.payroll_epfetf_config
                (employeeContribution,employerContributionEPF,employerContributionETF,appliesTo,enabled)
            VALUES (@employeeContribution,@employerContributionEPF,@employerContributionETF,@appliesTo,@enabled);
    END
    SELECT @@ROWCOUNT AS affected;
END
GO

-- ── 14. TAX MODE ─────────────────────────────────────────────
CREATE TABLE dbo.payroll_tax_mode (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    name          NVARCHAR(100) NOT NULL,
    effectiveDate DATE,
    status        NVARCHAR(20)  DEFAULT 'Active',
    createdAt     DATETIME      DEFAULT GETDATE()
);
GO

CREATE OR ALTER PROCEDURE dbo.payroll_tax_mode_sp
    @action        NVARCHAR(10),
    @id            INT           = NULL,
    @name          NVARCHAR(100) = NULL,
    @effectiveDate DATE          = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @action = 'INSERT'
        INSERT INTO dbo.payroll_tax_mode (name,effectiveDate) VALUES (@name,@effectiveDate);
    ELSE IF @action = 'UPDATE'
        UPDATE dbo.payroll_tax_mode SET name=@name, effectiveDate=@effectiveDate WHERE id=@id;
    ELSE IF @action = 'DELETE'
        UPDATE dbo.payroll_tax_mode SET status='Deleted' WHERE id=@id;
    SELECT @@ROWCOUNT AS affected;
END
GO

-- ── 15. TAX SLAB ─────────────────────────────────────────────
CREATE TABLE dbo.payroll_tax_slab (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    taxModeId     INT,
    modeName      NVARCHAR(100),
    fromAmount    DECIMAL(18,2),
    toAmount      DECIMAL(18,2),
    rate          DECIMAL(5,2),
    effectiveDate DATE,
    status        NVARCHAR(20)  DEFAULT 'Active',
    createdAt     DATETIME      DEFAULT GETDATE()
);
GO

CREATE OR ALTER PROCEDURE dbo.payroll_tax_slab_sp
    @action        NVARCHAR(10),
    @id            INT           = NULL,
    @taxModeId     INT           = NULL,
    @modeName      NVARCHAR(100) = NULL,
    @fromAmount    DECIMAL(18,2) = NULL,
    @toAmount      DECIMAL(18,2) = NULL,
    @rate          DECIMAL(5,2)  = NULL,
    @effectiveDate DATE          = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @action = 'INSERT'
        INSERT INTO dbo.payroll_tax_slab (taxModeId,modeName,fromAmount,toAmount,rate,effectiveDate)
        VALUES (@taxModeId,@modeName,@fromAmount,@toAmount,@rate,@effectiveDate);
    ELSE IF @action = 'UPDATE'
        UPDATE dbo.payroll_tax_slab SET
            fromAmount=@fromAmount, toAmount=@toAmount, rate=@rate, effectiveDate=@effectiveDate
        WHERE id=@id;
    ELSE IF @action = 'DELETE'
        UPDATE dbo.payroll_tax_slab SET status='Deleted' WHERE id=@id;
    SELECT @@ROWCOUNT AS affected;
END
GO
