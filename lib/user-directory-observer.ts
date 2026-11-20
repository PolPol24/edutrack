export type UserRole = "student" | "registrar" | "admin";
export type AccountStatus = "active" | "suspended";

export type DirectoryAccount = {
  user_id: number;
  account_number: string;
  full_name: string;
  email: string;
  role: UserRole;
  account_status: AccountStatus;
};

export type RoleCounts = Record<UserRole, number>;

export type AccountDirectorySnapshot = {
  accounts: readonly DirectoryAccount[];
  roleCounts: RoleCounts;
};

/** Observer contract for views that react to account-directory changes. */
export interface AccountDirectoryObserver {
  update(snapshot: AccountDirectorySnapshot): void;
}

/** Subject contract: views can subscribe to and detach from directory updates. */
export interface AccountDirectorySubject {
  attach(observer: AccountDirectoryObserver): void;
  detach(observer: AccountDirectoryObserver): void;
  notify(): void;
  getSnapshot(): AccountDirectorySnapshot;
}

function createRoleCounts(accounts: readonly DirectoryAccount[]): RoleCounts {
  const counts: RoleCounts = { student: 0, registrar: 0, admin: 0 };
  for (const account of accounts) counts[account.role] += 1;
  return counts;
}

/** Concrete Subject publishing one consistent snapshot to all attached views. */
export class UserDirectoryStore implements AccountDirectorySubject {
  private readonly observers = new Set<AccountDirectoryObserver>();
  private snapshot: AccountDirectorySnapshot = {
    accounts: [],
    roleCounts: { student: 0, registrar: 0, admin: 0 },
  };

  attach(observer: AccountDirectoryObserver): void {
    this.observers.add(observer);
  }

  detach(observer: AccountDirectoryObserver): void {
    this.observers.delete(observer);
  }

  getSnapshot(): AccountDirectorySnapshot {
    return this.snapshot;
  }

  replace(accounts: readonly DirectoryAccount[]): void {
    const currentAccounts = [...accounts];
    this.snapshot = {
      accounts: currentAccounts,
      roleCounts: createRoleCounts(currentAccounts),
    };
    this.notify();
  }

  notify(): void {
    for (const observer of [...this.observers]) {
      observer.update(this.snapshot);
    }
  }
}

/** Concrete Observer that refreshes the account table's data. */
export class AccountListObserver implements AccountDirectoryObserver {
  constructor(private readonly onUpdate: (accounts: readonly DirectoryAccount[]) => void) {}

  update(snapshot: AccountDirectorySnapshot): void {
    this.onUpdate(snapshot.accounts);
  }
}

/** Concrete Observer that refreshes the student, registrar, and admin totals. */
export class RoleSummaryObserver implements AccountDirectoryObserver {
  constructor(private readonly onUpdate: (counts: RoleCounts) => void) {}

  update(snapshot: AccountDirectorySnapshot): void {
    this.onUpdate(snapshot.roleCounts);
  }
}

export const userDirectory = new UserDirectoryStore();
