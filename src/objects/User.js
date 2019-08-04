class User {

	get login () {
		return this.userProfile.login;
	}

	get username () {
		return this.userProfile.getField("username");
	}

	constructor(userProfile, api) {
		this.userProfile = userProfile;
		this.api = api;
	}

	async createDM () {
		//let dmChannels = api.userProfile.getField("dmChannels");

		return await this.api.dmHelper.getChannelFor(this);
	}

	deleteDM() {

	}
}

module.exports = User;