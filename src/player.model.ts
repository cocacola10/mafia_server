// player.model.ts //이거는 원본에 없던 거임. 내가 추가한 듯.
// player.model.ts

export enum Role {
  Mafia = 'Mafia',
  Citizen = 'Citizen',
  Police = "Police",
  Doctor = "Doctor",
}

export class Player {
  constructor(public name: string, public role: Role, public isAlive: boolean = true) {}
}

  