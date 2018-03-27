import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux'

import { logMe } from '../../../actions/me'
import { fetchWrap } from '../../../services/fetchWrap'

import Auth42 from './OAuth/42'
import AuthFacebook from './OAuth/Facebook'
import AuthGoogle from './OAuth/Google'

import Input from '../../../components/Input'
import Tooltip from '../../../components/Tooltip/';

const errors = require('../../../errors.json');

class LogIn extends Component {

	constructor(props) {
		super(props)
		this.state = {
			login: '',
			password: '',
			error: {}
		}
		this.handleFormSubmit = this.handleFormSubmit.bind(this);
		this.handleInputChange = this.handleInputChange.bind(this);
		this.handleInputValidation = this.handleInputValidation.bind(this);
	}

	handleFormSubmit(event) {
		if (event) {
			event.preventDefault()
		}
		var error = this.state.error;
		if (!this.state.login) {
			error.login = 'default';
		}
		if (!this.state.password) {
			error.password = 'default';
		}
		if (!Object.keys(error).length) {
			fetchWrap('/connect/login', {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					login: this.state.login,
					password: this.state.password
				})
			})
			.then(payload => {
				this.props.dispatch(logMe(payload))
			})
			.catch(error => {
				if (error) {
					this.setState({ error })
				}
			})
		}
		else {
			this.setState({ error })
		}
	}

	handleInputChange(state, value) {
		this.setState({ [state]: value })
	}

	handleInputValidation(name, error) {
		var tmp = this.state.error;
		delete tmp[name];
		this.setState({ error: tmp });
	}

	render() {

		return (
			<div className='formBox'>
				<span className='lignBottom fontBig block'>Log in</span>
				<form className='fontLeft' onSubmit={this.handleFormSubmit}>
					<div className='fontGrey block fontSmall'>
						<label htmlFor='login'>Login or email</label>
					</div>
					<Input
						id='login'
						type='text'
						name='login'
						validation={{
							handleValidation: this.handleInputValidation,
							validateOnChange: true
						}}
						maxLen={50}
						onChange={this.handleInputChange}
						/>
					{
						this.state.error.hasOwnProperty('login') ?
						<Tooltip text={errors.login.login} visible={true} />
						:
						null
					}
						<div className='fontGrey block fontSmall'>
							<label htmlFor='password'>Password</label>
						</div>
					<Input
						id='password'
						type='password'
						name='password'
						validation={{
							handleValidation: this.handleInputValidation,
							validateOnChange: true
						}}
						maxLen={50}
						onChange={this.handleInputChange}
						/>
					{
						this.state.error.hasOwnProperty('password') ?
						<Tooltip text={errors.login.password} visible={true} />
						:
						null
					}
					<br />
					<div className='block fontXSmall fontCenter'>
						<Link to='/reset'>Forgot your password ?</Link>
					</div>
					<div className='block fontRight'>
						<div>
							<input className='spaceTop' type='submit' value='Log in'/>
						</div>
					</div>
				</form>
				<div className='button wFull spaceTop'>
					<Auth42 />
				</div>
				<div className='button wFull spaceTop'>
					<AuthFacebook />
				</div>
				<div className='button wFull spaceTop'>
					<AuthGoogle />
				</div>
				<div className='lignTop block fontSmall'>
					<Link to='/signup'>You want to create an account ?</Link>
				</div>
			</div>
		)
	}
}

function mapStateToProps(state) {
	const { isAuthenticated } = state.handleMe
	return ({
		isAuthenticated
	})
}

export default connect(mapStateToProps)(LogIn)